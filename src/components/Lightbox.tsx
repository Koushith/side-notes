import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useLightbox } from '@/stores/lightbox';
import { cn } from '@/lib/utils';

// Fullscreen viewer with wheel-to-zoom and drag-to-pan. Used for mermaid
// diagrams and images that render too small inline.
export function Lightbox() {
  const content = useLightbox((s) => s.content);
  const close = useLightbox((s) => s.close);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Reset the transform each time a new item opens.
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [content]);

  useEffect(() => {
    if (!content) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(8, s * 1.2));
      else if (e.key === '-') setScale((s) => Math.max(0.2, s / 1.2));
      else if (e.key === '0') {
        setScale(1);
        setTx(0);
        setTy(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [content, close]);

  if (!content) return null;

  const zoomBy = (factor: number) => setScale((s) => Math.min(8, Math.max(0.2, s * factor)));
  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        // Backdrop click closes; clicks on the content do not.
        if (e.target === e.currentTarget) close();
      }}
      onWheel={(e) => {
        zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
      }}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
        <ToolBtn onClick={() => zoomBy(1 / 1.2)} title="Zoom out (-)"><ZoomOut size={16} /></ToolBtn>
        <span className="px-2 text-[12px] font-mono text-white/70 tabular-nums w-14 text-center">
          {Math.round(scale * 100)}%
        </span>
        <ToolBtn onClick={() => zoomBy(1.2)} title="Zoom in (+)"><ZoomIn size={16} /></ToolBtn>
        <ToolBtn onClick={reset} title="Reset (0)"><Maximize size={15} /></ToolBtn>
        <ToolBtn onClick={close} title="Close (Esc)"><X size={16} /></ToolBtn>
      </div>

      <div
        className={cn('select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transition: dragging ? 'none' : 'transform 0.08s ease-out' }}
        onMouseDown={(e) => {
          e.preventDefault();
          drag.current = { x: e.clientX, y: e.clientY, tx, ty };
          setDragging(true);
        }}
        onMouseMove={(e) => {
          if (!drag.current) return;
          setTx(drag.current.tx + (e.clientX - drag.current.x));
          setTy(drag.current.ty + (e.clientY - drag.current.y));
        }}
        onMouseUp={() => {
          drag.current = null;
          setDragging(false);
        }}
        onMouseLeave={() => {
          drag.current = null;
          setDragging(false);
        }}
      >
        {content.kind === 'svg' ? (
          // Theme-matched surface: the SVG was rendered with the app's light/dark
          // palette, so a hardcoded white card hid dark-mode diagrams. Size the card
          // to the diagram's natural pixels (text at designed size) and pan/zoom over it.
          <div
            className="lightbox-svg inline-block [&_svg]:max-w-none [&_svg]:h-auto bg-bg border border-border rounded-lg p-6 shadow-2xl"
            dangerouslySetInnerHTML={{ __html: content.svg }}
          />
        ) : (
          <img
            src={content.src}
            alt={content.title ?? ''}
            draggable={false}
            className="rounded-lg shadow-2xl"
            style={{ maxWidth: '86vw', maxHeight: '86vh', display: 'block' }}
          />
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11.5px] text-white/50 font-mono">
        scroll to zoom · drag to pan · esc to close
      </div>
    </div>
  );
}

function ToolBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-9 w-9 place-items-center rounded-md bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
    >
      {children}
    </button>
  );
}
