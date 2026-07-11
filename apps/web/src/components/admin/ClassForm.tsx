/**
 * F9-16 — ClassForm: create/edit class form
 *
 * Client Component. Uses react-hook-form + Zod resolver.
 * Fields: title, slug (auto-generated from title, editable), description,
 * level, duration, capacity, image, SEO meta.
 *
 * Source: MEP Phase 9 F9-16, PAD §10.4 (Form Architecture).
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const classLevelValues = ['all', 'beginner', 'intermediate', 'advanced'] as const;

const classSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string().min(1, 'Slug is required').max(120),
  description: z.string().max(5000).optional(),
  level: z.enum(classLevelValues),
  durationMinutes: z.coerce.number().int().min(5, 'Minimum 5 minutes').max(480),
  maxCapacity: z.coerce.number().int().min(1, 'Minimum 1').max(500),
  imageKey: z.string().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface ClassFormProps {
  classId?: string; // if provided, edit mode
  initialData?: Partial<ClassFormValues>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ClassForm({
  classId,
  initialData,
  onSuccess,
  onCancel,
}: ClassFormProps) {
  const isEditMode = !!classId;
  const [slugEdited, setSlugEdited] = useState(!!initialData?.slug);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema) as Resolver<ClassFormValues>,
    defaultValues: {
      title: '',
      slug: '',
      level: 'all',
      durationMinutes: 60,
      maxCapacity: 20,
      ...initialData,
    },
  });

  const titleValue = watch('title');

  // Auto-generate slug from title unless user has manually edited the slug
  useEffect(() => {
    if (!slugEdited && titleValue) {
      setValue('slug', slugify(titleValue));
    }
  }, [titleValue, slugEdited, setValue]);

  const createMutation = trpc.classes.create.useMutation({
    onSuccess: () => {
      toast.success('Class created');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create class');
    },
  });

  const updateMutation = trpc.classes.update.useMutation({
    onSuccess: () => {
      toast.success('Class updated');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update class');
    },
  });

  const onSubmit = (data: ClassFormValues) => {
    if (isEditMode && classId) {
      updateMutation.mutate({ id: classId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Vinyasa Flow"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs text-error">{errors.title.message}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          {...register('slug', {
            onChange: () => setSlugEdited(true),
          })}
          placeholder="vinyasa-flow"
          aria-invalid={!!errors.slug}
        />
        {errors.slug && (
          <p className="text-xs text-error">{errors.slug.message}</p>
        )}
        <p className="text-xs text-stone-500">
          Auto-generated from title. Edit to customize.
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="A dynamic flow class linking breath to movement..."
        />
      </div>

      {/* Level + Duration + Capacity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            {...register('level')}
            className="flex h-9 w-full rounded-none border border-stone-300 bg-transparent px-3 py-1 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
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
          {errors.durationMinutes && (
            <p className="text-xs text-error">{errors.durationMinutes.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxCapacity">Max Capacity</Label>
          <Input
            id="maxCapacity"
            type="number"
            {...register('maxCapacity')}
            min={1}
            max={500}
          />
          {errors.maxCapacity && (
            <p className="text-xs text-error">{errors.maxCapacity.message}</p>
          )}
        </div>
      </div>

      {/* SEO Meta */}
      <details className="border border-stone-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-stone-700">
          SEO Metadata (optional)
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input id="metaTitle" {...register('metaTitle')} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              {...register('metaDescription')}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? 'Saving…'
            : isEditMode
              ? 'Update Class'
              : 'Create Class'}
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
