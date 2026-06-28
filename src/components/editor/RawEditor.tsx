import { useEffect, useRef, useState } from 'react';
import { useVault } from '@/stores/vault';
import { api } from '@/lib/api';
import { joinPath, basenameNoExt } from '@/lib/utils';
import { ViewModeTabs } from '../shared/ViewModeTabs';

interface Props {
  rel: string;
  vaultPath: string;
}

export function RawEditor({ rel, vaultPath }: Props) {
  const files = useVault((s) => s.files);
  const saveFile = useVault((s) => s.saveFile);
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastRel = useRef(rel);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    (async () => {
      try {
        const raw = await api.files.read(joinPath(vaultPath, rel));
        if (cancelled) return;
        setContent(raw);
        lastRel.current = rel;
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load file', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rel, vaultPath]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function onChange(value: string) {
    setContent(value);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const targetRel = lastRel.current;
    saveTimer.current = window.setTimeout(() => {
      saveFile(targetRel, value).catch(console.error);
    }, 400);
  }

  const file = files.get(rel);
  const title = file?.title ?? basenameNoExt(rel);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-16 pt-14 pb-2">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-end mb-3">
            <ViewModeTabs />
          </div>
          <h1 className="font-serif text-[40px] font-semibold tracking-tight leading-[1.1] text-text">
            {title}
          </h1>
          <div className="text-[12.5px] text-text-muted mt-2.5">
            Editing raw markdown source
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-16 pb-10">
        <div className="max-w-3xl mx-auto h-full">
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
            disabled={!loaded}
            className="w-full h-full min-h-[60vh] resize-none bg-transparent outline-none border-none font-mono text-[13.5px] leading-relaxed text-text placeholder:text-text-subtle"
            placeholder="# Start typing markdown…"
          />
        </div>
      </div>
    </div>
  );
}
