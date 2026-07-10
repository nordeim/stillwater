# ssh_git_wrapper (v3)

A self-contained, Paramiko-based drop-in replacement for OpenSSH's `ssh` client,
used as Git's SSH transport (`GIT_SSH_COMMAND`) in environments that lack
`openssh-client` — minimal containers, distroless images, and restricted
sandboxes.

It speaks enough of the OpenSSH CLI that Git can drive it unmodified, while
delegating key resolution and host-key handling to Paramiko.

> This document describes **`ssh_git_wrapper_v3.py`** (the `v3` implementation).

---

## Requirements

- Python **3.10+**
- `paramiko >= 3.0` (tested up to 5.x)

```bash
pip install paramiko
```

## Installation

```bash
chmod +x ssh_git_wrapper_v3.py
```

The script needs no configuration files of its own.

## Usage

Point Git at the wrapper via `GIT_SSH_COMMAND` (preferred):

```bash
export GIT_SSH_COMMAND="/path/to/ssh_git_wrapper_v3.py"
git clone git@github.com:user/repo.git
```

Or the legacy `GIT_SSH` variable (Git passes the destination host as the
first argument in this mode):

```bash
export GIT_SSH="/path/to/ssh_git_wrapper_v3.py"
git push origin main
```

Any SSH options Git would normally pass (`-p`, `-i`, `-o`, …) are forwarded
transparently. For example:

```bash
export GIT_SSH_COMMAND="ssh_git_wrapper_v3.py -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=accept-new"
git fetch
```

## Supported SSH flags

| Flag(s) | Form | Behavior |
|---------|------|----------|
| `-p`, `-p2222` | port | Sets the port. Invalid values print a warning to stderr and fall back to `22` (see Known Limitations). |
| `-i`, `-i/path` | identity | Private key path (supports `~` expansion). Existence/readability is checked before connecting. |
| `-l`, `-luser` | login | Login name; overrides any `user@host`. |
| `-o Key=Val` | option | Sets an SSH option. Keys are normalized to lowercase. `SendEnv` values accumulate across multiple `-o` directives. |
| `-v`, `-vv`, `-vvv` | verbosity | Maps to `WARNING` / `INFO` / `DEBUG` log level (overrides `-o LogLevel`). |
| `-F -b -c -E -I -J -K -L -R -D -m -O -S -w -W` | ignored | The flag and its following argument are consumed and discarded. ProxyJump / ProxyCommand / ssh_config are **not** executed. |
| `-q -4 -6 -A -a -C -f -g -k -M -N -n -s -T -t -X -x -Y -y -G` | ignored | Standalone no-op flags, accepted and ignored. |

Glued single-letter flags (e.g. `-p2222`, `-i/path`) are only permitted for
`-p`, `-i`, `-l`, and `-o`, matching OpenSSH semantics. All other glued forms
(e.g. `-Jhost`) are treated as unrecognised and skipped, leaving the real
destination host to parse normally.

The remote command is reconstructed with `shlex.join()` so argument boundaries
(including paths containing spaces) are preserved exactly.

## Configuration (`-o` options)

| Option | Effect |
|--------|--------|
| `StrictHostKeyChecking` | `yes` / `accept-new` / `no` (see Security). Case-insensitive. |
| `SendEnv` | Environment variables to forward (wildcards supported, e.g. `LC_*`, `GIT_PROTOCOL`). Multiple directives accumulate. Only variables actually set in the local environment are sent. |
| `LogLevel` | `DEBUG` / `INFO` / `WARNING` / `ERROR`. Overridden by `-v` flags when present. |
| `ConnectTimeout` | Connection timeout in seconds (positive integer). Invalid values fall back to the default (30s) with a warning. |
| `ServerAliveInterval` | Keep-alive interval in seconds. |

Verbosity is also controllable directly: `-v` → `WARNING`, `-vv` → `INFO`,
`-vvv` → `DEBUG`. Values above `-vvv` are ignored (as in OpenSSH, whose
maximum is `-vvv`).

## Security

Host-key verification is performed against `~/.ssh/known_hosts` using
OpenSSH-compatible policies selected by `StrictHostKeyChecking`:

| `StrictHostKeyChecking` | Policy | Behavior |
|-------------------------|--------|----------|
| `yes` | `RejectPolicy` | Refuse unknown **and** changed keys. |
| `accept-new` | `AcceptNewPolicy` | Accept and save genuinely new keys; **reject** changed keys (MITM protection). |
| `no` | `WarningPolicy` | Warn but connect, including for unknown hosts. |
| *(unset — default)* | `AcceptNewPolicy` | Same as `accept-new`. |

**Default behavior:** when `StrictHostKeyChecking` is not set, the wrapper uses
`AcceptNewPolicy` — it auto-accepts new hosts (so first-time Git connections
succeed) but **rejects any host whose key has changed** (the real man-in-the-middle
risk). This matches OpenSSH's recommended `StrictHostKeyChecking=accept-new` and
is the secure default for non-interactive Git.

Notes:
- `known_hosts` is always loaded when present, so previously-seen keys are
  validated and a changed key raises a clear `HOST KEY VERIFICATION FAILED`
  error (with guidance to remove the old key).
- `AcceptNewPolicy` rewrites `known_hosts` on first contact. Concurrent first-time
  connections from multiple processes are rare for a single-user Git wrapper; if
  one write is lost, the host simply needs re-acceptance. File locking is omitted
  as unnecessary complexity for this use case.

## Known Limitations

- **`-o` values containing spaces are unsupported.** OpenSSH allows
  `-o "Match exec ..."`; this wrapper does not. More precisely:
  - The *quoted* form `-o "StrictHostKeyChecking yes"` does **not** shift the
    host — the whole quoted string is one argument — but it produces a malformed
    option key `stricthostkeychecking yes` that will not be recognised.
  - The *unquoted* form `-o StrictHostKeyChecking yes git@host cmd` **does** break
    parsing: `yes` is consumed as the option value and `git@host` is misinterpreted
    as the host. Always use `-o Key=Value` (e.g. `-o StrictHostKeyChecking=yes`).
- **Invalid `-p` values do not abort.** OpenSSH fails with `illegal port number`;
  this wrapper prints a warning to stderr and falls back to port `22` to avoid
  breaking automated Git invocations.
- **Channel closes before exit status → exit code `255`.** If the connection drops
  before the remote reports an exit status, the wrapper performs an emergency drain
  and exits `255` rather than guessing the remote's code.
- **No interactive password authentication.** Keys or an SSH agent only.
- **No ProxyJump / ProxyCommand execution.** `-J` / `-W` are parsed and ignored.
- **No `ssh_config` parsing.** `-F` is parsed and ignored.
- **No SSH certificate (`CertificateFile`) support.**
- **Windows:** stdin forwarding uses blocking reads; the forwarding thread is a
  daemon joined on exit. Signal handling is Windows-safe (`SIGTERM` is skipped
  where unsupported).

## Implementation notes

- Auto-detects Ed25519 / ECDSA / RSA keys via Paramiko native resolution
  (`allow_agent=True`, `look_for_keys=True`), which correctly supports multi-key
  agents and encrypted keys (with a clear error message).
- The I/O loop is non-blocking during the transfer, then switches to a **blocking
  drain with a 5-second `socket.timeout`** once the exit status is ready — this
  prevents packfile truncation *and* indefinite hangs from servers that never send
  EOF. The loop breaks only on `channel.closed`, never on `eof_received` alone.
- `SIGINT` / `SIGTERM` are forwarded to the remote channel and trigger a clean
  local shutdown; original handlers are restored on exit. Signal registration is
  guarded with `getattr(signal, …)` so unsupported signals (e.g. `SIGTERM` on
  Windows) are skipped rather than crashing.
- Connection keep-alive is configured from `ServerAliveInterval`.

## Validation

The argument parser and policy logic are unit-testable without a network or a
real SSH server by stubbing `paramiko`. Representative checks:

```python
import importlib.util, sys, types

paramiko = types.ModuleType("paramiko")
for n in ["MissingHostKeyPolicy","RejectPolicy","WarningPolicy","SSHClient",
          "BadHostKeyException","PasswordRequiredException","AuthenticationException",
          "SSHException","Channel"]:
    setattr(paramiko, n, type(n, (), {}))
sys.modules["paramiko"] = paramiko

spec = importlib.util.spec_from_file_location("w", "ssh_git_wrapper_v3.py")
w = importlib.util.module_from_spec(spec); spec.loader.exec_module(w)

# Glued / spaced port
assert w.parse_args(["-p2222","git@host","cmd"])["port"] == 2222
# Invalid port -> falls back to default, warns on stderr
assert w.parse_args(["-p","abc","git@host","cmd"])["port"] == 22
# Lowercase option key
assert w.parse_args(["-o","strictHostKeyChecking=yes","git@host","cmd"])["options"]["stricthostkeychecking"] == "yes"
# SendEnv accumulation
assert w.parse_args(["-o","SendEnv=LC_*","-o","SendEnv=LANG","git@host","cmd"])["options"]["sendenv"] == ["LC_*","LANG"]
# Verbosity
assert w.parse_args(["-vvv","git@host","cmd"])["verbose"] == 3
# Default host-key policy is accept-new
class FakeClient:
    def __init__(self): self.policy=None
    def set_missing_host_key_policy(self, p): self.policy=p
    def load_host_keys(self, path): pass
fc = FakeClient(); w.setup_host_key_policy(fc, {})
assert isinstance(fc.policy, w.AcceptNewPolicy)
```
