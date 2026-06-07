import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Markdown variants Obsidian/typical vaults treat as editable notes.
// Kept in one place so indexing, link resolution, and UI checks stay in sync.
export const MARKDOWN_EXTS = ['md', 'markdown', 'mdx', 'mdown', 'mkd', 'mkdn', 'mdwn'] as const;
export const MARKDOWN_EXT_RE = /\.(md|markdown|mdx|mdown|mkd|mkdn|mdwn)$/i;

export function isMarkdownPath(p: string): boolean {
  return MARKDOWN_EXT_RE.test(p);
}

export const RASTER_IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;
export const SVG_EXT_RE = /\.svg$/i;
export const PDF_EXT_RE = /\.pdf$/i;

export function isImagePath(p: string): boolean {
  return RASTER_IMAGE_EXT_RE.test(p) || SVG_EXT_RE.test(p);
}

export function isPdfPath(p: string): boolean {
  return PDF_EXT_RE.test(p);
}

/** Attachments we can render in-tab (image or PDF). */
export function isViewablePath(p: string): boolean {
  return isImagePath(p) || isPdfPath(p);
}

export const EXCALIDRAW_EXT_RE = /\.excalidraw$/i;

export function isExcalidrawPath(p: string): boolean {
  return EXCALIDRAW_EXT_RE.test(p);
}

export function stripMarkdownExt(p: string): string {
  return p.replace(MARKDOWN_EXT_RE, '');
}

export function basenameNoExt(p: string) {
  const base = p.split(/[\\/]/).pop() ?? p;
  return base.replace(MARKDOWN_EXT_RE, '').replace(/\.canvas$/i, '').replace(EXCALIDRAW_EXT_RE, '');
}

export function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('/');
}
