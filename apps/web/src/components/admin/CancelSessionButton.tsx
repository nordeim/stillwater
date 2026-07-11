/**
 * CancelSessionButton — client component for cancelling a session
 *
 * Calls sessions.cancel with an optional reason via a dialog.
 *
 * Source: MEP Phase 9 F9-06.
 */

'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc/client';


interface CancelSessionButtonProps {
  sessionId: string;
}

export function CancelSessionButton({ sessionId }: CancelSessionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const cancelMutation = trpc.sessions.cancel.useMutation({
    onSuccess: () => {
      toast.success('Session cancelled');
      setOpen(false);
      setReason('');
      // Refresh the page to show updated status
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel session');
    },
  });

  const handleCancel = () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length === 0) return;
    cancelMutation.mutate({
      sessionId,
      reason: trimmedReason,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-xs font-medium uppercase tracking-[0.1em] text-stone-500 transition-colors hover:text-error"
          style={{ fontFamily: 'var(--font-mono)' }}
          aria-label={`Cancel session ${sessionId}`}
        >
          Cancel
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Cancelling this session will notify all enrolled members via email.
            Waitlist promotions will be triggered if applicable.
          </p>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => { setReason(e.target.value); }}
              rows={3}
              placeholder="e.g., Instructor unavailable, room maintenance…"
              maxLength={500}
              required
            />
            {reason.length === 0 && (
              <p className="text-xs text-error">A reason is required to cancel a session.</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelMutation.isPending || reason.trim().length === 0}
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Confirm Cancel'}
            </Button>
            <Button variant="outline" onClick={() => { setOpen(false); }}>
              Keep Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
