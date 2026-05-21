import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2, Copy } from 'lucide-react';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { basenameNoExt, cn, isPdfPath, joinPath } from '@/lib/utils';
import { toast } from './Toast';

interface Props {
  rel: string;
  vaultPath: string;
}

/** Tab-level viewer for non-editable attachments. Images render `<img>` (SVGs too,
 *  so any embedded scripts can't execute). PDFs go through Chromium's built-in viewer
 *  via `<embed>`. */
export function AttachmentViewer({ rel, vaultPath }: Props) {
  const files = useVault((s) => s.files);
  const file = files.get(rel);
  const title = file?.title ?? basenameNoExt(rel);
  const src = `vault:///${encodeVaultPath(rel)}`;
  const isPdf = isPdfPath(rel);
  const [fit, setFit] = useState<'fit' | 'actual'>('fit');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-16 pt-14 pb-3">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-[32px] font-semibold tracking-tight leading-[1.1] text-text truncate">
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-[12px] text-text-muted">
            <span className="font-mono text-[11px] text-text-subtle">{rel}</span>
            <span className="text-text-subtle">·</span>
            <button
              onClick={() => api.files.reveal(joinPath(vaultPath, rel))}
              className="inline-flex items-center gap-1 hover:text-text transition-colors"
            >
              <ExternalLink size={11} />
              Reveal in Finder
            </button>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(joinPath(vaultPath, rel))
                  .then(() => toast.success('Path copied'))
                  .catch(() => toast.error('Could not copy path'));
              }}
              className="inline-flex items-center gap-1 hover:text-text transition-colors"
            >
              <Copy size={11} />
              Copy path
            </button>
            {!isPdf && (
              <>
                <span className="text-text-subtle">·</span>
                <button
                  onClick={() => setFit((f) => (f === 'fit' ? 'actual' : 'fit'))}
                  className="inline-flex items-center gap-1 hover:text-text transition-colors"
                  title={fit === 'fit' ? 'Show at 1:1 actual size' : 'Fit to viewport'}
                >
                  {fit === 'fit' ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
                  {fit === 'fit' ? 'Actual size' : 'Fit'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-bg-elevated/30 border-t border-border-subtle">
        {isPdf ? (
          // Chromium's built-in PDF viewer (enabled via `plugins: true` in webPreferences).
          // <embed> shows the toolbar; <iframe> would also work but with fewer controls.
          <embed
            src={src}
            type="application/pdf"
            className="w-full h-full"
          />
        ) : (
          <div
            className={cn(
              'min-h-full w-full grid place-items-center p-6',
              fit === 'actual' && 'items-start'
            )}
          >
            <img
              src={src}
              alt={title}
              className={cn(
                'block shadow-2xl rounded-md',
                fit === 'fit'
                  ? 'max-w-full max-h-[calc(100vh-220px)] object-contain'
                  : 'max-w-none'
              )}
              onError={() => toast.error(`Could not load ${rel}`)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Encode each segment so spaces / unicode survive, but keep `/` as a separator. */
function encodeVaultPath(rel: string): string {
  return rel.split('/').map(encodeURIComponent).join('/');
}
