'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorMock } from './mocks/EditorMock';
import { GraphMock } from './mocks/GraphMock';
import { CanvasMock } from './mocks/CanvasMock';
import { DailyMock } from './mocks/DailyMock';

const SLIDES = [
  { id: 'editor', label: 'Editor', hint: 'Notion-style blocks, plain markdown on disk', Component: EditorMock },
  { id: 'graph', label: 'Connections', hint: 'See your knowledge as a network', Component: GraphMock },
  { id: 'canvas', label: 'Canvas', hint: 'Spatial thinking, infinite whiteboard', Component: CanvasMock },
  { id: 'daily', label: 'Daily note', hint: 'Date masthead, mood, loose ends', Component: DailyMock },
];

const PERIOD = 6000;

export function ProductCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    timerRef.current = window.setTimeout(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, PERIOD);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [active, paused]);

  useEffect(() => {
    const onVis = () => setPaused((p) => (document.hidden ? true : p));
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Frame */}
      <div className="relative aspect-[16/10] w-full mock-window rounded-[14px] border border-rule overflow-hidden bg-paper">
        {SLIDES.map((s, i) => {
          const Component = s.Component;
          const on = i === active;
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                on ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <Component />
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-px bg-rule rounded-[10px] overflow-hidden border border-rule">
        {SLIDES.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.id}
              onClick={() => {
                setActive(i);
                setPaused(false);
              }}
              className={`group relative bg-paper-2 px-4 py-3 text-left transition-colors hover:bg-paper-3 focus:outline-none ${
                isActive ? 'is-active' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10.5px] uppercase tracking-[0.12em] transition-colors ${
                    isActive ? 'text-accent-ink' : 'text-ink-3'
                  }`}
                >
                  {s.label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-ink-4">
                  0{i + 1}
                </span>
              </div>
              <div
                className={`mt-1.5 font-serif text-[13.5px] leading-snug ${
                  isActive ? 'text-ink' : 'text-ink-2'
                }`}
              >
                {s.hint}
              </div>
              <span
                key={`${s.id}-${active}-${paused ? 'p' : 'r'}`}
                className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent origin-left"
                style={{
                  transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                  transition: isActive && !paused ? `transform ${PERIOD}ms linear` : 'none',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
