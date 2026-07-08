'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * BookingConfirmation — Radix Dialog wrapper for booking success.
 *
 * Per SKILL §8.5: uses Radix Dialog for accessibility (focus trap, ESC to close).
 * Per SKILL §5.4: library discipline — use Radix, don't rebuild.
 */
export function BookingConfirmation({
  open,
  onClose,
  sessionDetails,
}: {
  open: boolean;
  onClose: () => void;
  sessionDetails: {
    className: string;
    startsAt: string;
    instructorName: string;
  };
}) {
  const formattedDate = new Date(sessionDetails.startsAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You&apos;re booked!</DialogTitle>
          <DialogDescription>
            Your spot in {sessionDetails.className} is confirmed.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2 text-sm text-stone-700">
          <p>
            <span className="font-medium">Class:</span> {sessionDetails.className}
          </p>
          <p>
            <span className="font-medium">When:</span> {formattedDate}
          </p>
          <p>
            <span className="font-medium">Instructor:</span>{' '}
            {sessionDetails.instructorName.replace(/-/g, ' ')}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="border border-stone-400 px-6 py-2 text-sm font-medium text-stone-900 transition-colors hover:bg-sand-warm"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
