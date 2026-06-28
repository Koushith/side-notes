import { useState } from 'react';
import { PanelRightClose, PanelRightOpen, Link2 } from 'lucide-react';
import { ConnectionsPanel } from './ConnectionsPanel';

const COLLAPSED_KEY = 'side.rightpanel.collapsed';

function readCollapsed(): boolean {
  try {
    const val = localStorage.getItem(COLLAPSED_KEY);
    if (val === null) return true;
    return val === '1';
  } catch {
    return true;
  }
}

export function RightPanel() {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    setCollapsed(next);
  };

  if (collapsed) {
    return (
      <aside className="w-9 shrink-0 border-l border-border bg-bg-elevated flex flex-col items-center pt-3 gap-2">
        <button
          onClick={toggleCollapsed}
          title="Expand panel"
          className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          <PanelRightOpen size={14} />
        </button>
        <button
          onClick={toggleCollapsed}
          title="Connections"
          className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          <Link2 size={13} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[280px] shrink-0 border-l border-border bg-bg-elevated overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-border-subtle">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-text">
          <Link2 size={12} className="text-text-muted" />
          Connections
        </div>
        <button
          onClick={toggleCollapsed}
          title="Collapse panel"
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          <PanelRightClose size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ConnectionsPanel />
      </div>
    </aside>
  );
}
