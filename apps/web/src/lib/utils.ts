import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names with conflict resolution.
 * Combines clsx (conditional/array/object syntax) with tailwind-merge (last-wins conflict resolution).
 *
 * @example
 * cn('p-2', 'p-4') // → 'p-4'
 * cn('base', isActive && 'active') // → 'base active' or 'base'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
