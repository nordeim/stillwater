/**
 * F9-18 — MemberRoleEditor: role assignment UI (owner only)
 *
 * Client Component. Dropdown to add role, remove role button.
 * Confirmation for `owner` role grant (destructive).
 *
 * Source: MEP Phase 9 F9-18, PAD §9.2 (RBAC matrix).
 */

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { StudioRole } from '@stillwater/auth';

const ALL_ROLES: StudioRole[] = ['member', 'instructor', 'staff', 'manager', 'owner'];

interface MemberRoleEditorProps {
  memberId: string;
  currentRoles: string[];
}

export function MemberRoleEditor({ memberId, currentRoles }: MemberRoleEditorProps) {
  const [selectedRole, setSelectedRole] = useState<StudioRole>('staff');
  const [confirmOwnerGrant, setConfirmOwnerGrant] = useState(false);

  // Note: admin.assignRole and admin.removeRole procedures are owner-only
  // (ownerProcedure). The member detail page only renders this component
  // when the current session user has the 'owner' role.
  const assignRoleMutation = trpc.admin.assignRole.useMutation({
    onSuccess: () => {
      toast.success(`Role ${selectedRole} assigned`);
      setConfirmOwnerGrant(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign role');
      setConfirmOwnerGrant(false);
    },
  });

  const removeRoleMutation = trpc.admin.removeRole.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`Role ${variables.role} removed`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove role');
    },
  });

  const handleAssign = () => {
    if (selectedRole === 'owner' && !confirmOwnerGrant) {
      setConfirmOwnerGrant(true);
      return;
    }
    assignRoleMutation.mutate({ memberId, role: selectedRole });
  };

  const handleRemove = (role: string) => {
    removeRoleMutation.mutate({
      memberId,
      role: role as 'member' | 'instructor' | 'staff' | 'manager' | 'owner',
    });
  };

  return (
    <div className="space-y-4">
      {/* Current roles */}
      <div className="flex flex-wrap gap-2">
        {currentRoles.map((role) => (
          <span
            key={role}
            className="flex items-center gap-2 border border-stone-300 px-3 py-1"
          >
            <span
              className="text-xs uppercase tracking-[0.1em] text-stone-700"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {role}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(role)}
              aria-label={`Remove ${role} role`}
              className="text-stone-400 hover:text-error"
            >
              ×
            </button>
          </span>
        ))}
        {currentRoles.length === 0 && (
          <p className="text-sm text-stone-500">No roles assigned (defaults to member).</p>
        )}
      </div>

      {/* Add role */}
      <div className="flex items-end gap-3">
        <div className="space-y-2">
          <label
            htmlFor="role-select"
            className="text-xs uppercase tracking-[0.1em] text-stone-500"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Add Role
          </label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as StudioRole)}
            className="flex h-9 w-40 rounded-none border border-stone-300 bg-transparent px-3 py-1 text-sm"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleAssign}
          variant={selectedRole === 'owner' ? 'destructive' : 'default'}
        >
          {confirmOwnerGrant
            ? 'Confirm Owner Grant'
            : 'Assign Role'}
        </Button>
      </div>

      {confirmOwnerGrant && (
        <p className="text-xs text-error">
          ⚠ Granting owner role gives full studio control. Click again to confirm.
        </p>
      )}
    </div>
  );
}
