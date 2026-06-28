import { lazy, Suspense } from 'react';

// Excalidraw is a heavy dependency (~1MB+). Load it in its own chunk only when an
// .excalidraw file is actually opened, so it never bloats the main bundle.
const ExcalidrawCanvas = lazy(() =>
  import('./ExcalidrawCanvas').then((m) => ({ default: m.ExcalidrawCanvas }))
);

interface Props {
  rel: string;
  vaultPath: string;
}

export function ExcalidrawView(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-text-muted text-sm">
          Loading drawing…
        </div>
      }
    >
      <ExcalidrawCanvas {...props} />
    </Suspense>
  );
}
