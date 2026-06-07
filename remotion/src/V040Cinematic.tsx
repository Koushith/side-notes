import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from 'remotion';
import React from 'react';
import { COLORS, FONTS } from './theme';
import { SlowType, KenBurns, Camera, Reveal, SoftFade, HaloBackdrop } from './components/cinematic';

const FPS = 30;

// Scene durations (frames).
const SLATE = 95;
const FEATURE = 165;
const MONTAGE = 230;
const OUTRO = 110;

// ---- Reusable app-window chrome -------------------------------------------
// A faithful SideNotes window (Carbon dark): traffic lights, sidebar, content.
function AppFrame({
  active,
  version = 'v0.4.0',
  children,
  right,
}: {
  active: string;
  version?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const nav = ['Today', 'All notes', 'Connections', 'Canvas', 'Pinned', 'Source Control'];
  return (
    <div
      style={{
        width: 1560,
        height: 880,
        borderRadius: 16,
        overflow: 'hidden',
        background: COLORS.bg,
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 60px 160px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONTS.sans,
      }}
    >
      {/* title bar */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: `1px solid ${COLORS.borderSubtle}`, background: COLORS.bg }}>
        <Dot c="#ff5f57" /><Dot c="#febc2e" /><Dot c="#28c840" />
        <span style={{ marginLeft: 12, color: COLORS.textMuted, fontSize: 13 }}>{active}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, color: COLORS.textSubtle, fontSize: 13 }}>
          <span>＋</span><span>☀</span><span>⚙</span><span>⋯</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* sidebar */}
        <div style={{ width: 232, borderRight: `1px solid ${COLORS.borderSubtle}`, background: COLORS.bgElevated, padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 16px' }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, background: COLORS.text, color: COLORS.bg, display: 'grid', placeItems: 'center', fontFamily: FONTS.serif, fontWeight: 700, fontStyle: 'italic', fontSize: 13 }}>S</span>
            <span style={{ fontFamily: FONTS.serif, fontWeight: 600, fontSize: 16, color: COLORS.text }}>SideNotes</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: COLORS.textSubtle, marginTop: 2 }}>{version}</span>
          </div>
          {nav.map((n) => {
            const on = n === active;
            return (
              <div key={n} style={{ padding: '7px 10px', borderRadius: 7, fontSize: 13.5, color: on ? COLORS.text : COLORS.textMuted, background: on ? COLORS.accentSubtle : 'transparent', fontWeight: on ? 600 : 400 }}>
                {n}
              </div>
            );
          })}
          <div style={{ marginTop: 18, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: COLORS.textSubtle, padding: '0 8px' }}>MY VAULT</div>
          {['ideas', 'daily', 'projects', 'reading'].map((f) => (
            <div key={f} style={{ padding: '6px 10px', fontSize: 13, color: COLORS.textMuted }}>📁 {f}</div>
          ))}
        </div>
        {/* main */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0, display: 'flex' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>{children}</div>
          {right}
        </div>
      </div>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span style={{ width: 12, height: 12, borderRadius: 99, background: c, display: 'inline-block' }} />;
}

// Eyebrow + headline caption that sits over the scene.
function Caption({ eyebrow, title, delay = 0 }: { eyebrow: string; title: string; delay?: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 110, top: 120, zIndex: 5, maxWidth: 760 }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 15, letterSpacing: 5, textTransform: 'uppercase', color: COLORS.accent, opacity: interpolate(frame - delay, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), marginBottom: 18 }}>
        {eyebrow}
      </div>
      <SlowType text={title} delay={delay + 6} cps={26} size={68} font={FONTS.serif} letterSpacing={-2} />
    </div>
  );
}

// Frames the app window in the lower-right, captioned upper-left, with a slow push.
function FeatureScene({ eyebrow, title, children, active, hold = FEATURE }: { eyebrow: string; title: string; children: React.ReactNode; active: string; hold?: number }) {
  return (
    <SoftFade durationFrames={hold}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <Caption eyebrow={eyebrow} title={title} />
        <div style={{ position: 'absolute', right: -120, top: 250, transform: 'rotate(-0.4deg)' }}>
          <Reveal delay={18} y={50}>
            <KenBurns from={1} to={1.05} panX={-30} panY={-14} duration={hold}>
              <AppFrame active={active}>{children}</AppFrame>
            </KenBurns>
          </Reveal>
        </div>
      </div>
    </SoftFade>
  );
}

// ---- Mock content panels ---------------------------------------------------

// A note with the floating voice recording pill.
function VoiceContent() {
  const frame = useCurrentFrame();
  const BARS = 26;
  return (
    <div style={{ padding: '46px 56px', height: '100%' }}>
      <div style={{ fontFamily: FONTS.serif, fontSize: 34, color: COLORS.text, marginBottom: 18 }}>Morning pages</div>
      <div style={{ fontFamily: FONTS.serif, fontSize: 19, lineHeight: 1.7, color: COLORS.textMuted, maxWidth: 620 }}>
        <SlowType text="Today I want to ship the voice feature and finally write that long overdue update for the" delay={20} cps={30} size={19} font={FONTS.serif} color={COLORS.textMuted} letterSpacing={0} lineHeight={1.7} />
        <span style={{ borderLeft: `2px solid ${COLORS.accent}`, marginLeft: 2 }} />
      </div>
      {/* recording pill */}
      <div style={{ position: 'absolute', bottom: 40, right: 40, display: 'flex', alignItems: 'center', gap: 16, background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, borderRadius: 99, padding: '14px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <span style={{ position: 'relative', width: 18, height: 18, display: 'grid', placeItems: 'center' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: 99, background: '#ef4444', opacity: 0.25 + Math.sin(frame / 6) * 0.15 }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: '#ef4444' }} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 34 }}>
          {Array.from({ length: BARS }).map((_, i) => {
            const h = 6 + (Math.sin(frame / 5 + i * 0.6) * 0.5 + 0.5) * 28;
            return <span key={i} style={{ width: 3, height: h, borderRadius: 99, background: COLORS.accent, opacity: 0.5 + (h / 34) * 0.5 }} />;
          })}
        </div>
      </div>
    </div>
  );
}

// AI Assistant side panel with actions and streaming output.
function AssistantContent() {
  const frame = useCurrentFrame();
  const out = 'Shipping the voice feature today, then writing the long overdue product update.';
  const shown = Math.min(out.length, Math.floor(Math.max(0, frame - 70) * 0.9));
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: '46px 50px' }}>
        <div style={{ fontFamily: FONTS.serif, fontSize: 30, color: COLORS.text, marginBottom: 16 }}>Morning pages</div>
        <div style={{ fontFamily: FONTS.serif, fontSize: 17, lineHeight: 1.7, color: COLORS.textMuted, maxWidth: 460, background: COLORS.accentSubtle, padding: 8, borderRadius: 6 }}>
          today i wanna ship the voice thing and like, write that update i keep putting off
        </div>
      </div>
      <div style={{ width: 320, borderLeft: `1px solid ${COLORS.borderSubtle}`, background: COLORS.bgElevated, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: COLORS.text, fontWeight: 600 }}>Assistant</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '10px 0 16px' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: COLORS.tag }} />
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>Anthropic · claude-sonnet</span>
        </div>
        {['Improve writing', 'Fix grammar', 'Summarize', 'Make shorter'].map((a, i) => (
          <div key={a} style={{ padding: '9px 10px', borderRadius: 7, fontSize: 13, color: i === 0 ? COLORS.text : COLORS.textMuted, background: i === 0 ? COLORS.bgHover : 'transparent', marginBottom: 2 }}>{a}</div>
        ))}
        <div style={{ marginTop: 16, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: COLORS.textSubtle }}>IMPROVE WRITING</div>
        <div style={{ marginTop: 8, padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontFamily: FONTS.serif, fontSize: 14, lineHeight: 1.55, color: COLORS.text, minHeight: 90 }}>
          {shown > 0 ? out.slice(0, shown) : <span style={{ color: COLORS.textSubtle, fontStyle: 'italic' }}>Waiting for model…</span>}
          {shown > 0 && shown < out.length && <span style={{ color: COLORS.accent }}>▍</span>}
        </div>
      </div>
    </div>
  );
}

// AI config / settings modal.
function ConfigContent() {
  const providers = ['Ollama', 'OpenAI', 'Anthropic', 'Bedrock'];
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.35)' }}>
      <Reveal delay={24} y={26}>
        <div style={{ width: 460, borderRadius: 14, border: `1px solid ${COLORS.border}`, background: COLORS.bgElevated, boxShadow: '0 40px 100px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${COLORS.borderSubtle}`, fontFamily: FONTS.serif, fontWeight: 600, fontSize: 15, color: COLORS.text }}>AI settings</div>
          <div style={{ display: 'flex', gap: 16, padding: '12px 18px', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
            <span style={{ fontSize: 13, color: COLORS.text, fontWeight: 600, borderBottom: `2px solid ${COLORS.accent}`, paddingBottom: 6 }}>Assistant</span>
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>Voice</span>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: COLORS.textSubtle, marginBottom: 8 }}>PROVIDER</div>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
              {providers.map((p, i) => (
                <span key={p} style={{ flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 5, fontSize: 12.5, color: i === 2 ? COLORS.text : COLORS.textMuted, background: i === 2 ? COLORS.bgElevated : 'transparent', fontWeight: i === 2 ? 600 : 400 }}>{p}</span>
              ))}
            </div>
            <div style={{ marginTop: 16, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: COLORS.textSubtle }}>API KEY</div>
            <div style={{ marginTop: 6, padding: '9px 11px', borderRadius: 7, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontFamily: FONTS.mono, fontSize: 13, color: COLORS.textMuted }}>sk-ant-••••••••••••••••</div>
            <div style={{ marginTop: 12, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: COLORS.textSubtle }}>MODEL</div>
            <div style={{ marginTop: 6, padding: '9px 11px', borderRadius: 7, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 13, color: COLORS.text }}>claude-sonnet-4-6</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <span style={{ padding: '7px 12px', borderRadius: 7, border: `1px solid ${COLORS.border}`, fontSize: 12.5, color: COLORS.textMuted }}>Test connection</span>
              <span style={{ fontSize: 12, color: COLORS.tag }}>✓ Connected</span>
              <span style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 7, background: COLORS.accent, color: COLORS.bg, fontSize: 12.5, fontWeight: 600 }}>Save</span>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// Realistic hand-drawn Excalidraw canvas. Rough strokes via slight path wobble.
function ExcalidrawContent() {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [18, 70], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hand = '"Comic Sans MS", "Segoe Print", "Bradley Hand", cursive';
  const dot = 'rgba(255,255,255,0.05)';
  return (
    <div style={{ height: '100%', position: 'relative', background: `radial-gradient(${dot} 1.4px, transparent 1.4px)`, backgroundSize: '26px 26px', backgroundColor: '#0c0c0f' }}>
      {/* excalidraw top toolbar */}
      <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, padding: 6, borderRadius: 10, background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
        {['▢', '◇', '○', '↗', '✎', 'A', '—'].map((t, i) => (
          <span key={i} style={{ width: 30, height: 30, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 14, color: i === 4 ? COLORS.bg : COLORS.textMuted, background: i === 4 ? COLORS.accent : 'transparent' }}>{t}</span>
        ))}
      </div>
      <svg width="100%" height="100%" viewBox="0 0 1100 760" style={{ position: 'absolute', inset: 0 }}>
        {/* sticky note (yellow) */}
        <g opacity={interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <path d="M150 150 q-4 -8 6 -9 l210 4 q10 0 9 9 l-3 120 q0 9 -9 8 l-208 -3 q-9 0 -8 -10 z" fill="#3a3413" stroke="#e9c46a" strokeWidth="2.5" />
          <text x="180" y="200" fill="#f3e0a6" fontFamily={hand} fontSize="26">Voice in</text>
          <text x="180" y="232" fill="#f3e0a6" fontFamily={hand} fontSize="26">2 seconds</text>
        </g>
        {/* rectangle (accent) */}
        <rect x="640" y="170" width="250" height="120" rx="10" fill="none" stroke={COLORS.accent} strokeWidth="3" strokeDasharray="760" strokeDashoffset={760 * draw} />
        <text x="690" y="240" fill={COLORS.text} fontFamily={hand} fontSize="28" opacity={interpolate(frame, [50, 62], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>Clean note</text>
        {/* arrow */}
        <path d="M375 215 q140 20 260 10" fill="none" stroke="#7dd3fc" strokeWidth="3" strokeDasharray="300" strokeDashoffset={300 * draw} />
        <polygon points="628,222 642,226 626,236" fill="#7dd3fc" opacity={interpolate(frame, [60, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        {/* ellipse (green) */}
        <ellipse cx="430" cy="470" rx="150" ry="78" fill="none" stroke="#86efac" strokeWidth="3" strokeDasharray="720" strokeDashoffset={720 * draw} />
        <text x="350" y="478" fill="#bbf7d0" fontFamily={hand} fontSize="26" opacity={interpolate(frame, [64, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>your vault</text>
        {/* connector down */}
        <path d="M765 290 q-10 90 -250 110" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeDasharray="360" strokeDashoffset={360 * draw} />
      </svg>
    </div>
  );
}

// Source Control panel, redesigned.
function SourceControlContent() {
  const frame = useCurrentFrame();
  return (
    <div style={{ height: '100%', padding: 0 }}>
      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${COLORS.borderSubtle}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: COLORS.textMuted }}>⎇</span>
        <span style={{ fontFamily: FONTS.mono, fontSize: 14, color: COLORS.text }}>main</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: COLORS.tag }}>✓ Up to date</span>
      </div>
      <div style={{ padding: 22 }}>
        <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.bgElevated, fontSize: 13, color: COLORS.textMuted, minHeight: 50 }}>
          Ship voice + drawings
        </div>
        <div style={{ marginTop: 12, padding: '12px 0', borderRadius: 8, background: COLORS.accent, color: COLORS.bg, textAlign: 'center', fontWeight: 600, fontSize: 15, transform: `scale(${0.98 + Math.sin(frame / 9) * 0.012})` }}>
          ↑ Push 2 commits to GitHub
        </div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['voice.ts', 'ExcalidrawView.tsx', 'ideas.excalidraw'].map((f, i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: interpolate(frame, [24 + i * 7, 36 + i * 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              <span style={{ color: COLORS.textSubtle }}>▢</span>
              <span style={{ fontSize: 13.5, color: COLORS.text }}>{f}</span>
              <span style={{ marginLeft: 'auto', fontFamily: FONTS.mono, fontSize: 12, color: COLORS.tag }}>{i === 2 ? 'A' : 'M'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Scenes ----------------------------------------------------------------

function Slate() {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0.85, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <SoftFade durationFrames={SLATE} fadeOut={18}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <div style={{ width: 104, height: 104, background: COLORS.text, color: COLORS.bg, borderRadius: 22, display: 'grid', placeItems: 'center', fontFamily: FONTS.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 62, transform: `scale(${scale})`, opacity, boxShadow: '0 40px 100px rgba(196,177,255,0.18)' }}>S</div>
          <SlowType text="SideNotes 0.4" delay={18} cps={10} size={90} font={FONTS.serif} letterSpacing={-2.5} />
          <div style={{ fontFamily: FONTS.mono, fontSize: 17, letterSpacing: 5, color: COLORS.accent, textTransform: 'uppercase', opacity: interpolate(frame, [48, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            voice, drawings, and your own AI
          </div>
        </div>
      </div>
    </SoftFade>
  );
}

// Montage of real product screenshots, each with a slow pan + label.
const MONTAGE_SHOTS: { src: string; label: string }[] = [
  { src: 'shots/raw/06-graph.png', label: 'Connections graph' },
  { src: 'shots/raw/12-canvas.png', label: 'Canvas' },
  { src: 'shots/raw/05-mermaid.png', label: 'Mermaid diagrams' },
  { src: 'shots/raw/11-theme.png', label: 'Six themes' },
  { src: 'shots/raw/02-daily.png', label: 'Daily notes' },
];

function Montage() {
  const per = Math.floor(MONTAGE / MONTAGE_SHOTS.length);
  return (
    <SoftFade durationFrames={MONTAGE}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <div style={{ position: 'absolute', left: 110, top: 80, zIndex: 5 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 15, letterSpacing: 5, textTransform: 'uppercase', color: COLORS.accent, marginBottom: 14 }}>and everything else</div>
          <SlowType text="Graphs, canvas, diagrams, themes." cps={28} size={56} font={FONTS.serif} letterSpacing={-1.5} />
        </div>
        {MONTAGE_SHOTS.map((s, i) => (
          <Sequence key={s.src} from={i * per} durationInFrames={per + 12} name={s.label}>
            <ShotCard src={s.src} label={s.label} hold={per + 12} flip={i % 2 === 1} />
          </Sequence>
        ))}
      </div>
    </SoftFade>
  );
}

function ShotCard({ src, label, hold, flip }: { src: string; label: string; hold: number; flip: boolean }) {
  return (
    <SoftFade durationFrames={hold} fadeIn={10} fadeOut={12}>
      <div style={{ position: 'absolute', right: flip ? 'auto' : -60, left: flip ? -60 : 'auto', bottom: 90, width: 1180, transform: `rotate(${flip ? 0.5 : -0.5}deg)` }}>
        <KenBurns from={1.04} to={1.12} panX={flip ? 24 : -24} panY={-12} duration={hold}>
          <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${COLORS.border}`, boxShadow: '0 50px 130px rgba(0,0,0,0.6)' }}>
            <Img src={staticFile(src)} style={{ width: '100%', display: 'block' }} />
          </div>
        </KenBurns>
        <div style={{ marginTop: 16, fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textMuted, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </SoftFade>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  return (
    <SoftFade durationFrames={OUTRO}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <SlowType text="SideNotes 0.4.0" cps={11} size={76} font={FONTS.serif} letterSpacing={-2} />
          <div style={{ opacity: interpolate(frame, [26, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), fontSize: 26, color: COLORS.textMuted }}>
            Local first. Private. Yours.
          </div>
          <div style={{ opacity: interpolate(frame, [44, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), marginTop: 8, fontFamily: FONTS.mono, fontSize: 15, color: COLORS.accent, letterSpacing: 2 }}>
            sidenotes.me
          </div>
        </div>
      </div>
    </SoftFade>
  );
}

// ---- Script ----------------------------------------------------------------
const SCRIPT: { key: string; hold: number; render: (h: number) => JSX.Element }[] = [
  { key: 'slate', hold: SLATE, render: () => <Slate /> },
  { key: 'voice', hold: FEATURE, render: () => <FeatureScene eyebrow="Voice dictation" title="Hold a key. Just talk." active="ideas" ><VoiceContent /></FeatureScene> },
  { key: 'assistant', hold: FEATURE, render: () => <FeatureScene eyebrow="AI assistant" title="Improve, fix, summarize." active="ideas"><AssistantContent /></FeatureScene> },
  { key: 'config', hold: FEATURE, render: () => <FeatureScene eyebrow="Bring your own model" title="Local or cloud. Your call." active="ideas"><ConfigContent /></FeatureScene> },
  { key: 'draw', hold: FEATURE, render: () => <FeatureScene eyebrow="Drawings" title="Sketch ideas in your vault." active="Canvas"><ExcalidrawContent /></FeatureScene> },
  { key: 'sc', hold: FEATURE, render: () => <FeatureScene eyebrow="Source control" title="Commit and push, in a click." active="Source Control"><SourceControlContent /></FeatureScene> },
  { key: 'montage', hold: MONTAGE, render: () => <Montage /> },
  { key: 'outro', hold: OUTRO, render: () => <Outro /> },
];

export function totalFramesV040Cinematic(): number {
  return SCRIPT.reduce((a, s) => a + s.hold, 0);
}

export function V040Cinematic() {
  useVideoConfig();
  let offset = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {SCRIPT.map((s) => {
        const seq = (
          <Sequence key={s.key} from={offset} durationInFrames={s.hold} name={s.key}>
            {s.render(s.hold)}
          </Sequence>
        );
        offset += s.hold;
        return seq;
      })}
    </AbsoluteFill>
  );
}
