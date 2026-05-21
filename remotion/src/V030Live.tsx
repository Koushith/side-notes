import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { COLORS, FONTS } from './theme';
import { MotionText, Eyebrow, GridBackdrop } from './components/motion';
import beatsData from '../public/captures/beats.json';

interface Beat {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
}

const FPS = 30;
const PRE_INTRO_FRAMES = 60;    // 2s typography intro before footage starts
const POST_OUTRO_FRAMES = 90;   // 3s outro after footage ends

// Map raw beat IDs to richer overlay copy & accent colors.
const BEAT_META: Record<string, { eyebrow: string; headline: string; tone?: 'accent' | 'tag' | 'link' }> = {
  hero: { eyebrow: 'v0.3.0', headline: 'SideNotes — your second brain on disk.' },
  today: { eyebrow: 'Daily note', headline: '12-day streak, carry-forward today.', tone: 'link' },
  typing: { eyebrow: 'Live', headline: 'Words and tasks count as you type.', tone: 'tag' },
  grouping: { eyebrow: 'Sidebar', headline: 'Year / Month grouping. Files stay flat.' },
  todo: { eyebrow: 'Todos', headline: 'Real progress chrome on every /todos/ file.', tone: 'accent' },
  palette: { eyebrow: '⌘K', headline: 'Jump anywhere.' },
  graph: { eyebrow: 'Graph', headline: 'See how your notes connect.', tone: 'link' },
  outro: { eyebrow: 'Get it', headline: 'sidenotes.me · v0.3.0', tone: 'accent' },
};

const beats = beatsData as Beat[];

function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

const FOOTAGE_FRAMES = beats.length > 0 ? msToFrames(beats[beats.length - 1].endMs) : FPS * 25;

export function totalFramesLive(): number {
  return PRE_INTRO_FRAMES + FOOTAGE_FRAMES + POST_OUTRO_FRAMES;
}

/** Pre-intro: typography slate so the cold-open isn't jarring */
function Slate() {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [PRE_INTRO_FRAMES - 10, PRE_INTRO_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: COLORS.bg, opacity: fadeOut }}>
      <GridBackdrop />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            background: COLORS.text,
            color: COLORS.bg,
            borderRadius: 18,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONTS.serif,
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 52,
          }}
        >
          S
        </div>
        <MotionText text="SideNotes — live tour" delay={6} size={72} font={FONTS.serif} letterSpacing={-1.5} />
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 16,
            letterSpacing: 5,
            color: COLORS.accent,
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          v0.3.0 · running on Carbon · dark
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** Overlay shown on top of a beat segment */
function BeatOverlay({ beat, duration }: { beat: Beat; duration: number }) {
  const frame = useCurrentFrame();
  const meta = BEAT_META[beat.id] ?? { eyebrow: beat.id, headline: beat.label };
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [duration - 14, duration], [1, 0], { extrapolateLeft: 'clamp' });
  const yIn = interpolate(frame, [0, 18], [16, 0], { extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);

  const toneColor =
    meta.tone === 'tag'
      ? COLORS.tag
      : meta.tone === 'link'
        ? COLORS.link
        : COLORS.accent;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Bottom gradient so labels read against any frame */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 360,
          background: `linear-gradient(to top, ${COLORS.bg}f0, ${COLORS.bg}00)`,
        }}
      />
      {/* Caption block, bottom-left */}
      <div
        style={{
          position: 'absolute',
          left: 80,
          bottom: 80,
          maxWidth: 1100,
          opacity,
          transform: `translateY(${yIn}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.mono,
            fontSize: 14,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: toneColor,
            marginBottom: 14,
          }}
        >
          {meta.eyebrow}
        </div>
        <div
          style={{
            fontFamily: FONTS.serif,
            fontSize: 56,
            fontWeight: 600,
            letterSpacing: -1.2,
            lineHeight: 1.1,
            color: COLORS.text,
            textShadow: '0 2px 16px rgba(0,0,0,0.45)',
          }}
        >
          {meta.headline}
        </div>
      </div>
      {/* Progress dots, bottom-right */}
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: 92,
          display: 'flex',
          gap: 6,
          opacity,
        }}
      >
        {beats.map((b) => (
          <span
            key={b.id}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: b.id === beat.id ? toneColor : COLORS.border,
            }}
          />
        ))}
      </div>
      {/* Watermark, top-right */}
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 80,
          fontFamily: FONTS.mono,
          fontSize: 13,
          letterSpacing: 2,
          color: COLORS.textSubtle,
          opacity,
          textTransform: 'uppercase',
        }}
      >
        SideNotes · v0.3.0
      </div>
    </AbsoluteFill>
  );
}

/** Outro: CTA card after the footage */
function Outro() {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [POST_OUTRO_FRAMES - 12, POST_OUTRO_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  return (
    <AbsoluteFill style={{ background: COLORS.bg, opacity: Math.min(fadeIn, fadeOut) }}>
      <GridBackdrop />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        <Eyebrow text="Update or grab" delay={0} />
        <MotionText text="sidenotes.me" delay={6} size={88} font={FONTS.serif} letterSpacing={-2} color={COLORS.accentInk} />
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 18,
            fontFamily: FONTS.mono,
            fontSize: 16,
            color: COLORS.textMuted,
          }}
        >
          <span>Plain markdown</span>
          <span>·</span>
          <span>No accounts</span>
          <span>·</span>
          <span>On your Mac</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function V030Live() {
  // Compute per-beat duration in frames from the captured timestamps
  const beatRanges = beats.map((b) => ({
    ...b,
    startF: msToFrames(b.startMs),
    endF: msToFrames(b.endMs),
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Pre-intro typography slate */}
      <Sequence from={0} durationInFrames={PRE_INTRO_FRAMES} name="slate">
        <Slate />
      </Sequence>

      {/* Live capture — plays the WebM under everything */}
      <Sequence from={PRE_INTRO_FRAMES} durationInFrames={FOOTAGE_FRAMES} name="capture">
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile('captures/live-demo.webm')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            muted
          />
        </AbsoluteFill>
        {/* Overlay one label per beat, positioned by capture timestamp */}
        {beatRanges.map((b) => {
          const duration = Math.max(1, b.endF - b.startF);
          return (
            <Sequence
              key={b.id}
              from={b.startF}
              durationInFrames={duration}
              name={`beat-${b.id}`}
            >
              <BeatOverlay beat={b} duration={duration} />
            </Sequence>
          );
        })}
      </Sequence>

      {/* Outro */}
      <Sequence
        from={PRE_INTRO_FRAMES + FOOTAGE_FRAMES}
        durationInFrames={POST_OUTRO_FRAMES}
        name="outro"
      >
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
}
