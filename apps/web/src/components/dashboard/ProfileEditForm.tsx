'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';


const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(120),
  phone: z.string().max(40).optional().or(z.literal('')),
  emergencyContact: z.string().max(200).optional().or(z.literal('')),
  emergencyPhone: z.string().max(40).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditForm({
  initialValues,
}: {
  initialValues: {
    displayName: string;
    phone: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
}) {
  const [isSaved, setIsSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  const updateProfile = trpc.members.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated!');
      setIsSaved(true);
      setTimeout(() => { setIsSaved(false); }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    // Strip empty strings → undefined so we don't null-out untouched columns
    const patch = Object.fromEntries(
      Object.entries(data)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([k, v]) => [k, v === '' ? undefined : v]),
    );
    updateProfile.mutate(patch);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="displayName" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
          Display Name
        </label>
        <input
          {...register('displayName')}
          id="displayName"
          type="text"
          className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-stone-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-water-500 focus-visible:outline-offset-2"
        />
        {errors.displayName && (
          <p className="mt-1 text-xs text-error">{errors.displayName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
          Phone
        </label>
        <input
          {...register('phone')}
          id="phone"
          type="tel"
          className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-stone-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-water-500 focus-visible:outline-offset-2"
        />
      </div>

      <div>
        <label htmlFor="emergencyContact" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
          Emergency Contact
        </label>
        <input
          {...register('emergencyContact')}
          id="emergencyContact"
          type="text"
          className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-stone-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-water-500 focus-visible:outline-offset-2"
        />
      </div>

      <div>
        <label htmlFor="emergencyPhone" className="block text-xs font-medium uppercase tracking-wider text-stone-500">
          Emergency Phone
        </label>
        <input
          {...register('emergencyPhone')}
          id="emergencyPhone"
          type="tel"
          className="mt-2 w-full border border-stone-300 bg-white px-4 py-3 text-stone-900 focus:border-stone-900 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-water-500 focus-visible:outline-offset-2"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[44px] bg-clay-500 px-8 py-3 text-sm font-medium text-sand-100 transition-colors hover:bg-clay-600 disabled:opacity-50"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </button>
        {isSaved && (
          <span className="text-sm text-success">✓ Saved</span>
        )}
      </div>
    </form>
  );
}
