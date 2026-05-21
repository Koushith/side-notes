import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { COLORS, FONTS } from './theme';
import {
  Camera,
  HaloBackdrop,
  KenBurns,
  Reveal,
  SlowType,
  SoftFade,
} from './components/cinematic';
import { FolderCinematic } from './sections/folderCinematic';
import beatsData from '../public/captures/beats.json';

// ---- Timing ----------------------------------------------------------------
const FPS = 30;
const F = (s: number) => Math.round(s * FPS);

// Per-section frame budgets (~110s total cinematic cut)
const SLATE = F(4.5);          // intro slate
const FOLDER = F(13);          // folder flat creation centerpiece
const MERMAID = F(10);
const VIEWER = F(10);
const TODOS = F(10);
const LIVE_PAD = F(0.8);       // slight pre-roll into the capture
const CAPTURE_MS = beatsData[beatsData.length - 1]?.endMs ?? 22000;
const CAPTURE = Math.round((CAPTURE_MS / 1000) * FPS);
const RECAP = F(11);           // fixes recap montage
const OUTRO = F(7);

export function totalFramesCinematic(): number {
  return SLATE + FOLDER + MERMAID + VIEWER + TODOS + LIVE_PAD + CAPTURE + RECAP + OUTRO;
}

// Toggle music via env: `WITH_AUDIO=1 npm run render-cinematic`
// after dropping bg.mp3 into public/audio/. Default renders silent.
const HAS_AUDIO = (typeof process !== 'undefined' && process.env?.REMOTION_AUDIO === '1');

// ---- Sections -------------------------------------------------------------

function Slate() {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 30], [0.85, 1], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <SoftFade durationFrames={SLATE} fadeOut={20}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              background: COLORS.text,
              color: COLORS.bg,
              borderRadius: 22,
              display: 'grid',
              placeItems: 'center',
              fontFamily: FONTS.serif,
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: 68,
              transform: `scale(${scale})`,
              opacity,
              boxShadow: '0 40px 100px rgba(196, 177, 255, 0.18)',
            }}
          >
            S
          </div>
          <SlowType text="SideNotes" delay={20} cps={9} size={96} font={FONTS.serif} letterSpacing={-2.5} />
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 18,
              letterSpacing: 6,
              color: COLORS.accent,
              textTransform: 'uppercase',
              opacity: interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            v0.3.0 · what shipped
          </div>
        </div>
      </div>
    </SoftFade>
  );
}

function MermaidScene() {
  const frame = useCurrentFrame();
  return (
    <SoftFade durationFrames={MERMAID}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <KenBurns from={1} to={1.06} duration={MERMAID}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '120px 140px',
              gap: 18,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 14,
                letterSpacing: 4,
                color: COLORS.accent,
                textTransform: 'uppercase',
                opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              Mermaid diagrams
            </div>
            <SlowType
              text="Write a graph. See a graph."
              delay={10}
              cps={20}
              size={72}
              font={FONTS.serif}
              letterSpacing={-1.8}
            />
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginTop: 36 }}>
              <Reveal delay={60} style={{ flex: 1 }}>
                <div
                  style={{
                    background: COLORS.bgElevated,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: 24,
                    fontFamily: FONTS.mono,
                    fontSize: 18,
                    lineHeight: 1.8,
                    color: COLORS.text,
                    minHeight: 220,
                  }}
                >
                  <div style={{ color: COLORS.textMuted, marginBottom: 8 }}>```mermaid</div>
                  <div><SlowType text="graph TD" delay={65} cps={14} size={18} font={FONTS.mono} color={COLORS.text} letterSpacing={0} /></div>
                  <div><SlowType text="  Idea --> Worth{Worth shipping?}" delay={85} cps={22} size={18} font={FONTS.mono} color={COLORS.text} letterSpacing={0} /></div>
                  <div><SlowType text="  Worth -->|Yes| Build" delay={130} cps={22} size={18} font={FONTS.mono} color={COLORS.text} letterSpacing={0} /></div>
                  <div><SlowType text="  Worth -->|No|  Park" delay={160} cps={22} size={18} font={FONTS.mono} color={COLORS.text} letterSpacing={0} /></div>
                  <div style={{ color: COLORS.textMuted, marginTop: 8 }}>```</div>
                </div>
              </Reveal>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  color: COLORS.accent,
                  fontSize: 42,
                  opacity: interpolate(frame, [190, 220], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                }}
              >
                →
              </div>
              <Reveal delay={200} style={{ flex: 1 }}>
                <DiagramSVG />
              </Reveal>
            </div>
          </div>
        </KenBurns>
      </div>
    </SoftFade>
  );
}

function ViewerScene() {
  const exts = ['.png', '.jpg', '.gif', '.webp', '.svg', '.bmp', '.avif', '.pdf'];
  return (
    <SoftFade durationFrames={VIEWER}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <Camera fromScale={1.08} toScale={1} duration={VIEWER} easing="easeOut">
          <div style={{ position: 'absolute', inset: 0, padding: '120px 140px' }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 4, color: COLORS.accent, textTransform: 'uppercase' }}>
              Image + PDF viewer
            </div>
            <div style={{ marginTop: 18 }}>
              <SlowType
                text="Click any attachment. Open it in a tab."
                cps={22}
                size={68}
                font={FONTS.serif}
                letterSpacing={-1.6}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 64, maxWidth: 1200 }}>
              {exts.map((ext, i) => (
                <Reveal
                  key={ext}
                  delay={60 + i * 10}
                  y={20}
                  style={{
                    padding: '20px 28px',
                    borderRadius: 14,
                    border: `1px solid ${COLORS.accent}`,
                    background: COLORS.accentSubtle,
                    fontFamily: FONTS.mono,
                    fontSize: 30,
                    color: COLORS.accentInk,
                  }}
                >
                  {ext}
                </Reveal>
              ))}
            </div>
            <div
              style={{
                marginTop: 48,
                fontFamily: FONTS.sans,
                fontSize: 22,
                color: COLORS.textMuted,
              }}
            >
              Native PDF viewer · Fit / Actual size · Reveal in Finder
            </div>
          </div>
        </Camera>
      </div>
    </SoftFade>
  );
}

function TodosScene() {
  const frame = useCurrentFrame();
  const pct = Math.min(78, Math.round(interpolate(frame, [50, 220], [0, 78], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  return (
    <SoftFade durationFrames={TODOS}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <KenBurns from={1.04} to={1} duration={TODOS}>
          <div style={{ position: 'absolute', inset: 0, padding: '120px 140px' }}>
            <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 4, color: COLORS.accent, textTransform: 'uppercase' }}>
              Todo notes
            </div>
            <div style={{ marginTop: 18 }}>
              <SlowType
                text="Any /todos/ folder gets a real header."
                cps={20}
                size={64}
                font={FONTS.serif}
                letterSpacing={-1.5}
              />
            </div>
            <Reveal delay={40} y={30} style={{ marginTop: 56 }}>
              <div
                style={{
                  background: COLORS.bgElevated,
                  border: `1px solid ${COLORS.borderSubtle}`,
                  borderRadius: 16,
                  padding: '40px 44px',
                  maxWidth: 880,
                  display: 'flex',
                  gap: 36,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ width: 88, textAlign: 'center', fontFamily: FONTS.serif }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: COLORS.textMuted, letterSpacing: 3 }}>FRI</div>
                  <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2.5, color: COLORS.text }}>22</div>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: COLORS.textMuted, letterSpacing: 3 }}>MAY 26</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONTS.mono, fontSize: 14, color: COLORS.textMuted, letterSpacing: 3 }}>
                    WORK/TODOS
                  </div>
                  <div style={{ marginTop: 18, fontFamily: FONTS.sans, fontSize: 22, color: COLORS.textMuted }}>
                    <span style={{ color: COLORS.text, fontWeight: 600 }}>5 open</span>
                    {' · '}12 done{' · '}
                    <span style={{ color: COLORS.accentInk, fontFamily: FONTS.mono }}>{pct}%</span>
                  </div>
                  <div
                    style={{
                      marginTop: 18,
                      height: 3,
                      width: '100%',
                      background: COLORS.borderSubtle,
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ height: '100%', width: `${pct}%`, background: COLORS.accent, opacity: 0.85 }} />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </KenBurns>
      </div>
    </SoftFade>
  );
}

/** Pre-roll into the live capture: full-screen "Now, the actual app." card. */
function LivePreRoll() {
  return (
    <SoftFade durationFrames={LIVE_PAD}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SlowType
            text="Now, the actual app."
            cps={18}
            size={72}
            font={FONTS.serif}
            letterSpacing={-1.8}
            align="center"
          />
        </div>
      </div>
    </SoftFade>
  );
}

function LiveCapture() {
  const frame = useCurrentFrame();
  const beats = beatsData as Array<{ id: string; label: string; startMs: number; endMs: number }>;
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile('captures/live-demo.webm')}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        muted
      />
      {/* Per-beat label overlay */}
      {beats.map((b) => {
        const fromF = Math.round((b.startMs / 1000) * FPS);
        const endF = Math.round((b.endMs / 1000) * FPS);
        const dur = Math.max(1, endF - fromF);
        const localFrame = frame - fromF;
        if (localFrame < 0 || localFrame > dur) return null;
        return <BeatLabel key={b.id} id={b.id} dur={dur} localFrame={localFrame} />;
      })}
      {/* Top-right watermark */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 80,
          fontFamily: FONTS.mono,
          fontSize: 14,
          letterSpacing: 3,
          color: COLORS.textSubtle,
          textTransform: 'uppercase',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        SideNotes · v0.3.0
      </div>
    </AbsoluteFill>
  );
}

const BEAT_COPY: Record<string, { eyebrow: string; headline: string; tone?: string }> = {
  hero: { eyebrow: 'Carbon · dark', headline: 'Your plain-markdown second brain.' },
  today: { eyebrow: 'Streak · 12 days', headline: 'Yesterday rolls into today.', tone: 'link' },
  typing: { eyebrow: 'Live', headline: 'Words and tasks count as you type.', tone: 'tag' },
  grouping: { eyebrow: 'Sidebar', headline: 'Year / Month grouping. Disk stays flat.' },
  todo: { eyebrow: 'Todos', headline: 'Real progress chrome.', tone: 'accent' },
  palette: { eyebrow: '⌘K', headline: 'Jump anywhere.' },
  graph: { eyebrow: 'Graph', headline: 'See how your notes connect.', tone: 'link' },
  outro: { eyebrow: 'v0.3.0', headline: 'Everything in one box.', tone: 'accent' },
};

function BeatLabel({ id, dur, localFrame }: { id: string; dur: number; localFrame: number }) {
  const meta = BEAT_COPY[id] ?? { eyebrow: id, headline: id };
  const fadeIn = interpolate(localFrame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(localFrame, [dur - 14, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const y = interpolate(localFrame, [0, 20], [22, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);
  const toneColor =
    meta.tone === 'tag' ? COLORS.tag : meta.tone === 'link' ? COLORS.link : COLORS.accent;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to top, ${COLORS.bg}cc 0%, transparent 38%, transparent 62%, ${COLORS.bg}66 100%)`,
          opacity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 80,
          maxWidth: 1100,
          opacity,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 15,
            letterSpacing: 4,
            color: toneColor,
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          {meta.eyebrow}
        </div>
        <div
          style={{
            fontFamily: FONTS.serif,
            fontSize: 60,
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.05,
            color: COLORS.text,
            textShadow: '0 2px 18px rgba(0,0,0,0.55)',
          }}
        >
          {meta.headline}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function RecapMontage() {
  // Five fix beats in fast succession with Ken Burns. Each gets ~2s.
  const beats: { eyebrow: string; copy: string; tone?: string }[] = [
    { eyebrow: 'Critical fix', copy: 'External edits never get clobbered again.', tone: 'tag' },
    { eyebrow: 'Polish', copy: 'Themed dialogs replace the native modals.' },
    { eyebrow: 'Path resolver', copy: 'blog/<slug>/foo.png — just works locally.' },
    { eyebrow: 'Live counts', copy: 'Tasks and words tick the moment you type.' },
    { eyebrow: 'Carbon · dark', copy: 'The new default theme on fresh installs.', tone: 'accent' },
  ];
  const each = Math.floor(RECAP / beats.length);
  return (
    <SoftFade durationFrames={RECAP}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg, overflow: 'hidden' }}>
        <HaloBackdrop />
        {beats.map((b, i) => (
          <Sequence key={i} from={i * each} durationInFrames={each}>
            <RecapCard {...b} duration={each} />
          </Sequence>
        ))}
      </div>
    </SoftFade>
  );
}

function RecapCard({ eyebrow, copy, tone, duration }: { eyebrow: string; copy: string; tone?: string; duration: number }) {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });
  const outOp = interpolate(frame, [duration - 10, duration], [1, 0], { extrapolateLeft: 'clamp' });
  const opacity = Math.min(inOp, outOp);
  const scale = interpolate(frame, [0, duration], [1.06, 1], { extrapolateRight: 'clamp' });
  const toneColor =
    tone === 'tag' ? COLORS.tag : tone === 'accent' ? COLORS.accent : COLORS.link;
  return (
    <AbsoluteFill style={{ display: 'grid', placeItems: 'center', opacity }}>
      <div style={{ transform: `scale(${scale})`, textAlign: 'center', maxWidth: 1400, padding: '0 120px' }}>
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 16,
            letterSpacing: 5,
            color: toneColor,
            textTransform: 'uppercase',
            marginBottom: 22,
          }}
        >
          {eyebrow}
        </div>
        <SlowType text={copy} cps={32} size={64} font={FONTS.serif} letterSpacing={-1.5} align="center" />
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  return (
    <SoftFade durationFrames={OUTRO}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg }}>
        <HaloBackdrop />
        <KenBurns from={1} to={1.04} duration={OUTRO}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 17,
                letterSpacing: 6,
                color: COLORS.accent,
                textTransform: 'uppercase',
                opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              Update or grab
            </div>
            <SlowType
              text="sidenotes.me"
              delay={20}
              cps={11}
              size={108}
              font={FONTS.serif}
              letterSpacing={-2.5}
              color={COLORS.accentInk}
            />
            <div
              style={{
                marginTop: 22,
                display: 'flex',
                gap: 22,
                fontFamily: FONTS.mono,
                fontSize: 18,
                color: COLORS.textMuted,
                opacity: interpolate(frame, [70, 110], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              }}
            >
              <span>Plain markdown</span>
              <span>·</span>
              <span>No accounts</span>
              <span>·</span>
              <span>Lives on your Mac</span>
            </div>
          </div>
        </KenBurns>
      </div>
    </SoftFade>
  );
}

// SVG used in the Mermaid scene
function DiagramSVG() {
  return (
    <div
      style={{
        background: COLORS.bgElevated,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 24,
        minHeight: 220,
      }}
    >
      <svg viewBox="0 0 380 220" width="100%" height="100%">
        <defs>
          <marker id="arr-c" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={COLORS.textMuted} />
          </marker>
        </defs>
        <g fontFamily={FONTS.sans} fontSize={14} fill={COLORS.text}>
          <rect x={20} y={40} width={110} height={44} rx={8} fill={COLORS.bgHover} stroke={COLORS.border} />
          <text x={75} y={67} textAnchor="middle">Idea</text>
          <path d="M130 62 L170 62" stroke={COLORS.textMuted} strokeWidth={1.4} markerEnd="url(#arr-c)" />
          <polygon
            points="240,32 320,62 240,92 160,62"
            fill={COLORS.accentSubtle}
            stroke={COLORS.accent}
            strokeWidth={1.4}
          />
          <text x={240} y={66} textAnchor="middle" fill={COLORS.accentInk}>Worth shipping?</text>
          <path d="M210 90 L150 160" stroke={COLORS.textMuted} strokeWidth={1.4} markerEnd="url(#arr-c)" />
          <rect x={80} y={150} width={110} height={44} rx={8} fill={COLORS.bgHover} stroke={COLORS.border} />
          <text x={135} y={177} textAnchor="middle">Build</text>
          <path d="M270 90 L320 160" stroke={COLORS.textMuted} strokeWidth={1.4} markerEnd="url(#arr-c)" />
          <rect x={250} y={150} width={110} height={44} rx={8} fill={COLORS.bgHover} stroke={COLORS.border} />
          <text x={305} y={177} textAnchor="middle">Park</text>
        </g>
      </svg>
    </div>
  );
}

// ---- Main composition ------------------------------------------------------
export function V030Cinematic() {
  let offset = 0;
  const push = (frames: number) => {
    const from = offset;
    offset += frames;
    return from;
  };
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {HAS_AUDIO && (
        <Audio src={staticFile('audio/bg.mp3')} volume={0.45} />
      )}
      <Sequence from={push(SLATE)} durationInFrames={SLATE}><Slate /></Sequence>
      <Sequence from={push(FOLDER)} durationInFrames={FOLDER}><FolderCinematic durationFrames={FOLDER} /></Sequence>
      <Sequence from={push(MERMAID)} durationInFrames={MERMAID}><MermaidScene /></Sequence>
      <Sequence from={push(VIEWER)} durationInFrames={VIEWER}><ViewerScene /></Sequence>
      <Sequence from={push(TODOS)} durationInFrames={TODOS}><TodosScene /></Sequence>
      <Sequence from={push(LIVE_PAD)} durationInFrames={LIVE_PAD}><LivePreRoll /></Sequence>
      <Sequence from={push(CAPTURE)} durationInFrames={CAPTURE}><LiveCapture /></Sequence>
      <Sequence from={push(RECAP)} durationInFrames={RECAP}><RecapMontage /></Sequence>
      <Sequence from={push(OUTRO)} durationInFrames={OUTRO}><Outro /></Sequence>
    </AbsoluteFill>
  );
}
