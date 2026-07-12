Set up Sanity using the `sanity-best-practices` skill's `getting-started` reference.

If the skill can't be found, install it by running `npx skills add sanity-io/agent-toolkit --skill sanity-best-practices -y`. If the install fails, stop and ask me to run it.

Context:
- Project: Stillwater (v2gzd4bc)
- Dataset: production
- Framework: Next.js
- Project Type: Other
- Connect Sanity to my existing Next.js app — the Studio lives in `studio-stillwater`, a sibling folder next to my app folder
- First, confirm `studio-stillwater` and my app folder are both in your working directory. If you only see my app's source code, stop and ask me to restart you from the parent folder.
- If you're not sure which folder is my app, ask me
- Keep the Studio standalone — do not embed it in or move it into my app

---

$ cd /home/project/studio-stillwater && ls -l
total 420
-rw-rw-r-- 1 pete pete    527 Jul 12 11:05 README.md
-rw-rw-r-- 1 pete pete     78 Jul 12 11:05 eslint.config.mjs
drwxrwxr-x 6 pete pete   4096 Jul 12 11:07 node_modules
-rw-rw-r-- 1 pete pete    797 Jul 12 11:05 package.json
-rw-rw-r-- 1 pete pete 386935 Jul 12 11:07 pnpm-lock.yaml
-rw-rw-r-- 1 pete pete     50 Jul 12 11:07 pnpm-workspace.yaml
-rw-rw-r-- 1 pete pete    341 Jul 12 11:05 sanity.cli.ts
-rw-rw-r-- 1 pete pete    381 Jul 12 11:05 sanity.config.ts
drwxrwxr-x 2 pete pete   4096 Jul 12 11:05 schemaTypes
drwxrwxr-x 2 pete pete   4096 Jul 12 11:05 static
-rw-rw-r-- 1 pete pete    417 Jul 12 11:05 tsconfig.json

$ npm create sanity@latest -- --project v2gzd4bc --dataset production --template clean --typescript --output-path studio-stillwater
Need to install the following packages:
create-sanity@6.0.15
Ok to proceed? (y) y
npm warn deprecated uuid@10.0.0: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
npm notice run npx
npm notice run 'create-sanity' --project v2gzd4bc --dataset production --template clean --typescript --output-path studio-stillwater
✔ Please log in or create a new account GitHub

Opening browser at https://api.sanity.io/v1/auth/login/github?type=token&label=pop-os+%2F+Linux&origin=http%3A%2F%2Flocalhost%3A4321%2Fcallback

✔ You are logged in as nordeimkuahsziyp@outlook.com using GitHub
✔ Fetching existing projects

✔ Configure Sanity MCP and agent skills for these editors? Antigravity, Cline CLI, Cursor, Gemini CLI, MCPorter, VS Code
✔ MCP configured for Antigravity, Cline CLI, Cursor, Gemini CLI, MCPorter, VS Code
✔ Sanity agent skills installed: [sanity-best-practices, sanity-migration]

  Universal (~/.agents/skills)
    Antigravity, Cline, Cursor, Gemini CLI, GitHub Copilot

✔ Bootstrapping files from template
✔ Resolving latest module versions
✔ Creating default project files
✔ Package manager to use for installing dependencies? pnpm
✔ Running pnpm install

✅ Success! Your Studio has been created.

(cd /home/project/studio-stillwater to navigate to your new project directory)

Get started by running pnpm dev to launch your Studio's development server

Restart Antigravity, Cline CLI, Cursor, Gemini CLI, MCPorter, and VS Code and type "Get started with Sanity" in the chat.

Learn more: https://mcp.sanity.io

Have feedback? Tell us in the community: https://www.sanity.io/community/join


Other helpful commands:
npx sanity docs browse     to open the documentation in a browser
npx sanity manage          to open the project settings in a browser
npx sanity help            to explore the CLI manual

