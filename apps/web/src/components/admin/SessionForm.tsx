/**
 * F9-17 — SessionForm: create/edit session form
 *
 * Client Component. Uses react-hook-form + Zod.
 * Fields: class selector, instructor selector, room selector, date + time
 * picker, capacity override (optional), virtual toggle + stream URL.
 *
 * Source: MEP Phase 9 F9-17, PAD §10.4 (Form Architecture).
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const sessionSchema = z.object({
  classId: z.string().uuid('Select a class'),
  instructorId: z.string().uuid('Select an instructor'),
  roomId: z.string().uuid().optional(),
  startsAt: z.string().min(1, 'Start date/time is required'),
  durationMinutes: z.coerce.number().int().min(5).max(480).default(60),
  overrideCapacity: z.coerce.number().int().min(1).max(500).optional(),
  isVirtual: z.boolean().default(false),
  streamUrl: z.string().url().optional(),
}).refine(
  (data) => !data.isVirtual || data.streamUrl,
  { message: 'Stream URL is required for virtual sessions', path: ['streamUrl'] }
);

type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionFormProps {
  initialData?: Partial<SessionFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SessionForm({ initialData, onSuccess, onCancel }: SessionFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      durationMinutes: 60,
      isVirtual: false,
      ...initialData,
    },
  });

  // Fetch classes, instructors, rooms for selectors
  const [classesQuery, instructorsQuery] = trpc.useQueries((t) => [
    t.classes.list(),
    t.instructors.list(),
  ]);

  const createMutation = trpc.sessions.create.useMutation({
    onSuccess: () => {
      toast.success('Session created');
      onSuccess?.();
    },
    onError: (error) => toast.error(error.message || 'Failed to create session'),
  });

  const isVirtual = watch('isVirtual');

  const onSubmit = (data: SessionFormValues) => {
    createMutation.mutate({
      classId: data.classId,
      instructorId: data.instructorId,
      roomId: data.roomId,
      startsAt: new Date(data.startsAt),
      durationMinutes: data.durationMinutes,
      overrideCapacity: data.overrideCapacity,
      isVirtual: data.isVirtual,
      streamUrl: data.streamUrl,
    });
  };

  const isLoading = isSubmitting || createMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Class selector */}
      <div className="space-y-2">
        <Label htmlFor="classId">Class</Label>
        <select
          id="classId"
          {...register('classId')}
          className="flex h-9 w-full rounded-none border border-stone-300 bg-transparent px-3 py-1 text-sm"
          defaultValue=""
        >
          <option value="" disabled>Select a class…</option>
          {classesQuery.data?.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.title}
            </option>
          ))}
        </select>
        {errors.classId && (
          <p className="text-xs text-error">{errors.classId.message}</p>
        )}
      </div>

      {/* Instructor selector */}
      <div className="space-y-2">
        <Label htmlFor="instructorId">Instructor</Label>
        <select
          id="instructorId"
          {...register('instructorId')}
          className="flex h-9 w-full rounded-none border border-stone-300 bg-transparent px-3 py-1 text-sm"
          defaultValue=""
        >
          <option value="" disabled>Select an instructor…</option>
          {instructorsQuery.data?.map((ins) => (
            <option key={ins.id} value={ins.id}>
              {ins.name}
            </option>
          ))}
        </select>
        {errors.instructorId && (
          <p className="text-xs text-error">{errors.instructorId.message}</p>
        )}
      </div>

      {/* Date + time + duration */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Start Date & Time</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            {...register('startsAt')}
          />
          {errors.startsAt && (
            <p className="text-xs text-error">{errors.startsAt.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            type="number"
            {...register('durationMinutes')}
            min={5}
            max={480}
          />
        </div>
      </div>

      {/* Capacity override */}
      <div className="space-y-2">
        <Label htmlFor="overrideCapacity">Override Capacity (optional)</Label>
        <Input
          id="overrideCapacity"
          type="number"
          {...register('overrideCapacity')}
          min={1}
          max={500}
          placeholder="Leave empty to use class default"
        />
      </div>

      {/* Virtual toggle */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="isVirtual"
          checked={isVirtual}
          onCheckedChange={(checked) => setValue('isVirtual', checked === true)}
        />
        <Label htmlFor="isVirtual" className="cursor-pointer">
          Virtual session (requires stream URL)
        </Label>
      </div>

      {/* Stream URL (conditional) */}
      {isVirtual && (
        <div className="space-y-2">
          <Label htmlFor="streamUrl">Stream URL</Label>
          <Input
            id="streamUrl"
            type="url"
            {...register('streamUrl')}
            placeholder="https://meet.stillwater.studio/…"
          />
          {errors.streamUrl && (
            <p className="text-xs text-error">{errors.streamUrl.message}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating…' : 'Create Session'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
