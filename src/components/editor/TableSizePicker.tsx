import { useState } from 'react';

interface Props {
  rect: { left: number; top: number };
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}

const MAX_ROWS = 8;
const MAX_COLS = 8;

export function TableSizePicker({ rect, onInsert, onClose }: Props) {
  const [hovered, setHovered] = useState<{ row: number; col: number }>({ row: 0, col: 0 });

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className="fixed z-50 rounded-lg border border-border bg-bg-elevated shadow-2xl animate-fade-in p-3"
        style={{ left: rect.left, top: rect.top + 4 }}
      >
        <div className="text-xs text-text-subtle mb-2 font-medium">
          {hovered.row > 0
            ? `${hovered.row} x ${hovered.col} table`
            : 'Choose table size'}
        </div>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
          onMouseLeave={() => setHovered({ row: 0, col: 0 })}
        >
          {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, idx) => {
            const row = Math.floor(idx / MAX_COLS) + 1;
            const col = (idx % MAX_COLS) + 1;
            const active = row <= hovered.row && col <= hovered.col;
            return (
              <button
                key={idx}
                className={
                  'w-5 h-5 rounded-[3px] border transition-colors ' +
                  (active
                    ? 'bg-accent/30 border-accent/60'
                    : 'bg-bg-hover border-border hover:border-text-subtle')
                }
                onMouseEnter={() => setHovered({ row, col })}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsert(row, col);
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <button
            className="w-full text-left text-xs text-text-muted hover:text-text px-1 py-1 rounded hover:bg-bg-hover transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              onInsert(3, 3);
            }}
          >
            Quick: 3x3 with header
          </button>
        </div>
      </div>
    </>
  );
}
