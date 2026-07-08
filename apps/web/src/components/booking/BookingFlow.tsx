'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { BookingButton } from './BookingButton';
import { BookingConfirmation } from './BookingConfirmation';
import { SeatAvailability } from './SeatAvailability';
import { WaitlistButton } from './WaitlistButton';

import { useBookingMutation } from '@/hooks/useBookingMutation';
import { useSessionAvailability } from '@/hooks/useSessionAvailability';
import { trpc } from '@/lib/trpc/client';



/**
 * BookingFlow — orchestrates the full booking experience.
 *
 * Per SKILL §5.3: Client Component (uses EventSource + tRPC mutations).
 * Per SKILL §15.1: bookings.book uses advisory lock (server-side).
 * Per SKILL §1.4: CONFLICT (full) → show WaitlistButton.
 *
 * Flow:
 *   1. useSessionAvailability subscribes to SSE for live seat counts
 *   2. SeatAvailability displays the count
 *   3. BookingButton triggers bookings.book mutation
 *   4. On CONFLICT → WaitlistButton appears
 *   5. On success → BookingConfirmation dialog + toast
 */
export function BookingFlow({
  sessionId,
  sessionDetails,
}: {
  sessionId: string;
  sessionDetails: {
    className: string;
    startsAt: string;
    instructorName: string;
  };
}) {
  const { data, isLoading, error } = useSessionAvailability(sessionId);
  const { book, isLoading: isBooking, isConflict, result, reset } = useBookingMutation();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const waitlistMutation = trpc.waitlist.join.useMutation({
    onSuccess: () => {
      toast.success('Added to waitlist!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to join waitlist');
    },
  });

  const handleBook = () => {
    book(sessionId);
  };

  const handleWaitlist = () => {
    waitlistMutation.mutate({ sessionId });
  };

  // Show confirmation when booking succeeds
  if (result && !showConfirmation) {
    setShowConfirmation(true);
  }

  if (isLoading) {
    return (
      <div aria-busy="true" className="py-8 text-center text-stone-500">
        Loading seat availability…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-stone-600">
        Seat availability temporarily unavailable.
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <SeatAvailability {...data} />

      {/* Booking CTA — only show if session has spots OR if conflict (user tried to book but it was full) */}
      {!data.isFull && !isConflict && (
        <BookingButton onClick={handleBook} disabled={false} isLoading={isBooking} />
      )}

      {/* Waitlist CTA — show if session is full OR if booking returned CONFLICT */}
      {(data.isFull || isConflict) && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            This class is currently full. Join the waitlist and we&apos;ll notify you if a spot opens up.
          </p>
          <WaitlistButton
            onClick={handleWaitlist}
            disabled={false}
            isLoading={waitlistMutation.isPending}
          />
        </div>
      )}

      {/* Confirmation dialog */}
      <BookingConfirmation
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          reset();
        }}
        sessionDetails={sessionDetails}
      />
    </div>
  );
}
