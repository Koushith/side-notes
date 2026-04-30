import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function basenameNoExt(p: string) {
  const base = p.split(/[\\/]/).pop() ?? p;
  return base.replace(/\.(md|canvas)$/i, '');
}

export function dirname(p: string) {
  const parts = p.split(/[\\/]/);
  parts.pop();
  return parts.join('/');
}

export function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('/');
}

export function slugify(s: string) {
  return s
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}
