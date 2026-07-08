'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import { trpc } from '@/lib/trpc/client';

/**
 * useBookingMutation — wraps the bookings.book tRPC mutation.
 *
 * Per SKILL §15.1: booking uses advisory lock (server-side).
 * Per SKILL §1.4: handles CONFLICT (session full) → caller should show WaitlistButton.
 * Per SKILL §14.6: rate-limited to 10/min per user (server-side).
 *
 * Returns:
 *   - book(sessionId): triggers the mutation
 *   - isLoading: mutation in flight
 *   - isConflict: last error was CONFLICT (session full)
 *   - result: booking confirmation data on success
 */
export function useBookingMutation() {
  const [isConflict, setIsConflict] = useState(false);
  const [result, setResult] = useState<{ enrollmentId: string } | null>(null);

  const mutation = trpc.bookings.book.useMutation({
    onSuccess: (data) => {
      setResult({ enrollmentId: data.id });
      setIsConflict(false);
      toast.success('Booking confirmed!');
    },
    onError: (error) => {
      if (error.data?.code === 'CONFLICT') {
        setIsConflict(true);
        toast.error('Session is full. Join the waitlist?');
      } else {
        setIsConflict(false);
        toast.error(error.message || 'Booking failed. Please try again.');
      }
    },
  });

  const book = (sessionId: string) => {
    setResult(null);
    setIsConflict(false);
    mutation.mutate({ sessionId });
  };

  return {
    book,
    isLoading: mutation.isPending,
    isConflict,
    result,
    reset: () => {
      setResult(null);
      setIsConflict(false);
      mutation.reset();
    },
  };
}
