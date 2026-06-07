import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS, FONTS } from './theme';
import { MotionText, Eyebrow, PopCard, GridBackdrop, CrossFade } from './components/motion';
import React from 'react';

const VERSION = 'v0.4.0';

// ---- Section chrome (mirrors sectionFrame but stamped v0.4.0) ----
function Frame({
  children,
  hold,
  number,
  total,
}: {
  children: React.ReactNode;
  hold: number;
  number: number;
  total: number;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONTS.sans,
      }}
    >
      <GridBackdrop />
      <CrossFade hold={hold}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            padding: '120px 140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </CrossFade>
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: 140,
          right: 140,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: FONTS.mono,
          fontSize: 13,
          letterSpacing: 1.5,
          color: COLORS.textSubtle,
          textTransform: 'uppercase',
        }}
      >
        <span>SideNotes · {VERSION}</span>
        <span>
          {String(number).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

// A row of bullet points that fade up one by one.
function Bullets({ items, delay = 0 }: { items: string[]; delay?: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {items.map((it, i) => {
        const t = frame - delay - i * 7;
        const opacity = interpolate(t, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const x = interpolate(t, [0, 14], [-12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div
            key={i}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontFamily: FONTS.sans,
              fontSize: 26,
              color: COLORS.textMuted,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 99, background: COLORS.accent, flexShrink: 0 }} />
            {it}
          </div>
        );
      })}
    </div>
  );
}

// Two-column layout: copy on the left, a visual mock on the right.
function Split({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 90 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{left}</div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{right}</div>
    </div>
  );
}

// ---- Intro ----
function Intro({ hold }: { hold: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONTS.sans,
      }}
    >
      <GridBackdrop />
      <CrossFade hold={hold}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 30,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              transform: `scale(${0.9 + logo * 0.1})`,
              opacity: logo,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 20,
                background: COLORS.text,
                color: COLORS.bg,
                display: 'grid',
                placeItems: 'center',
                fontFamily: FONTS.serif,
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 48,
              }}
            >
              S
            </div>
            <div style={{ fontFamily: FONTS.serif, fontWeight: 600, fontSize: 80, letterSpacing: -2 }}>
              SideNotes
            </div>
          </div>
          <div style={{ opacity: interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            <span
              style={{
                fontFamily: FONTS.mono,
                fontSize: 26,
                letterSpacing: 6,
                color: COLORS.accent,
                border: `1px solid ${COLORS.accentSubtle}`,
                padding: '8px 20px',
                borderRadius: 99,
                background: COLORS.accentSubtle,
              }}
            >
              {VERSION}
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <MotionText
              text="Voice. Drawings. Effortless sync."
              delay={34}
              size={34}
              weight={500}
              font={FONTS.sans}
              color={COLORS.textMuted}
              letterSpacing={0}
            />
          </div>
        </div>
      </CrossFade>
    </div>
  );
}

// ---- Voice dictation ----
function VoiceMock() {
  const frame = useCurrentFrame();
  const BARS = 22;
  return (
    <PopCard delay={20}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          background: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 99,
          padding: '20px 26px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ position: 'relative', width: 22, height: 22, display: 'grid', placeItems: 'center' }}>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 99,
              background: '#ef4444',
              opacity: 0.25 + Math.sin(frame / 6) * 0.15,
            }}
          />
          <span style={{ width: 11, height: 11, borderRadius: 99, background: '#ef4444' }} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 46 }}>
          {Array.from({ length: BARS }).map((_, i) => {
            const h = 8 + (Math.sin(frame / 5 + i * 0.6) * 0.5 + 0.5) * 38;
            return (
              <span
                key={i}
                style={{ width: 4, height: h, borderRadius: 99, background: COLORS.accent, opacity: 0.55 + (h / 46) * 0.45 }}
              />
            );
          })}
        </div>
        <span style={{ width: 34, height: 34, borderRadius: 99, background: COLORS.accent, display: 'grid', placeItems: 'center', color: COLORS.bg, fontSize: 16 }}>
          ●
        </span>
      </div>
    </PopCard>
  );
}

function VoiceSection({ hold, number, total }: { hold: number; number: number; total: number }) {
  return (
    <Frame hold={hold} number={number} total={total}>
      <Split
        left={
          <>
            <Eyebrow text="NEW · VOICE DICTATION" />
            <MotionText text="Hold a key. Just talk." size={66} delay={6} maxWidth={620} />
            <Bullets
              delay={26}
              items={['Cloud accuracy or fully-offline Whisper', 'Filler words cleaned up by AI', 'Dropped right at your cursor']}
            />
          </>
        }
        right={<VoiceMock />}
      />
    </Frame>
  );
}

// ---- Excalidraw drawings ----
function DrawMock() {
  const frame = useCurrentFrame();
  const dash = interpolate(frame, [16, 46], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <PopCard delay={14}>
      <div
        style={{
          width: 460,
          height: 320,
          background: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          position: 'relative',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <svg width="460" height="320" style={{ position: 'absolute', inset: 0 }}>
          {/* node A */}
          <rect x="48" y="70" width="150" height="78" rx="10" fill="none" stroke={COLORS.accent} strokeWidth="3"
            strokeDasharray="500" strokeDashoffset={500 * dash} />
          {/* node B */}
          <rect x="270" y="180" width="150" height="78" rx="10" fill="none" stroke={COLORS.link} strokeWidth="3"
            strokeDasharray="500" strokeDashoffset={500 * dash} />
          {/* arrow */}
          <line x1="198" y1="120" x2="270" y2="205" stroke={COLORS.text} strokeWidth="3"
            strokeDasharray="160" strokeDashoffset={160 * dash} />
          <polygon points="262,196 272,208 256,210" fill={COLORS.text} opacity={interpolate(frame, [40, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        </svg>
        <div style={{ position: 'absolute', left: 70, top: 96, fontFamily: FONTS.serif, fontSize: 24, color: COLORS.text, opacity: interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Idea
        </div>
        <div style={{ position: 'absolute', left: 292, top: 206, fontFamily: FONTS.serif, fontSize: 24, color: COLORS.text, opacity: interpolate(frame, [44, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          Ship it
        </div>
      </div>
    </PopCard>
  );
}

function DrawSection({ hold, number, total }: { hold: number; number: number; total: number }) {
  return (
    <Frame hold={hold} number={number} total={total}>
      <Split
        left={
          <>
            <Eyebrow text="NEW · DRAWINGS" />
            <MotionText text="Sketch anything, in your vault." size={64} delay={6} maxWidth={640} />
            <Bullets
              delay={30}
              items={['Excalidraw, built in — and offline', 'Saves as a plain .excalidraw file', 'New Drawing from the + menu or a folder']}
            />
          </>
        }
        right={<DrawMock />}
      />
    </Frame>
  );
}

// ---- Source Control ----
function ScMock() {
  const frame = useCurrentFrame();
  return (
    <PopCard delay={14}>
      <div
        style={{
          width: 460,
          background: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 22,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          fontFamily: FONTS.sans,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONTS.mono, fontSize: 18, color: COLORS.text }}>
          <span style={{ color: COLORS.textMuted }}>⎇</span> main
          <span style={{ marginLeft: 'auto', color: COLORS.tag, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ Up to date
          </span>
        </div>
        <div
          style={{
            marginTop: 18,
            padding: '14px 16px',
            borderRadius: 10,
            background: COLORS.accent,
            color: COLORS.bg,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: 19,
            transform: `scale(${0.97 + Math.sin(frame / 8) * 0.015})`,
          }}
        >
          ↑ Push 1 commit to GitHub
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['daily/2026-06-08.md', 'ideas.excalidraw'].map((f, i) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: interpolate(frame, [20 + i * 8, 32 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
              <span style={{ color: COLORS.textSubtle, fontSize: 16 }}>▢</span>
              <span style={{ color: COLORS.text, fontSize: 17 }}>{f}</span>
              <span style={{ marginLeft: 'auto', color: COLORS.tag, fontFamily: FONTS.mono, fontSize: 14 }}>M</span>
            </div>
          ))}
        </div>
      </div>
    </PopCard>
  );
}

function ScSection({ hold, number, total }: { hold: number; number: number; total: number }) {
  return (
    <Frame hold={hold} number={number} total={total}>
      <Split
        left={
          <>
            <Eyebrow text="REBUILT · SOURCE CONTROL" />
            <MotionText text="Commit. Push. Done." size={66} delay={6} maxWidth={620} />
            <Bullets
              delay={26}
              items={['Updates live as you write', 'One tap to commit & push to GitHub', 'Errors in plain English, not git-speak']}
            />
          </>
        }
        right={<ScMock />}
      />
    </Frame>
  );
}

// ---- Outro ----
function Outro({ hold }: { hold: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: COLORS.bg, color: COLORS.text, fontFamily: FONTS.sans }}>
      <GridBackdrop />
      <CrossFade hold={hold}>
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 24 }}>
          <MotionText text="SideNotes 0.4.0" size={72} font={FONTS.serif} />
          <div style={{ opacity: interpolate(frame, [22, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), fontFamily: FONTS.sans, fontSize: 28, color: COLORS.textMuted }}>
            Local-first. Private. Yours.
          </div>
        </div>
      </CrossFade>
    </div>
  );
}

// ---- Script ----
const SCRIPT: { key: string; hold: number; render: (h: number, n: number, t: number) => JSX.Element }[] = [
  { key: 'intro', hold: 120, render: (h) => <Intro hold={h} /> },
  { key: 'voice', hold: 170, render: (h, n, t) => <VoiceSection hold={h} number={n} total={t} /> },
  { key: 'draw', hold: 170, render: (h, n, t) => <DrawSection hold={h} number={n} total={t} /> },
  { key: 'sc', hold: 170, render: (h, n, t) => <ScSection hold={h} number={n} total={t} /> },
  { key: 'outro', hold: 120, render: (h) => <Outro hold={h} /> },
];

const FEATURE_TOTAL = SCRIPT.filter((s) => !['intro', 'outro'].includes(s.key)).length;

export function totalFramesV040(): number {
  return SCRIPT.reduce((a, s) => a + s.hold, 0);
}

export function V040() {
  useVideoConfig();
  let offset = 0;
  let featureNo = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {SCRIPT.map((section) => {
        const isFeature = !['intro', 'outro'].includes(section.key);
        if (isFeature) featureNo += 1;
        const seq = (
          <Sequence key={section.key} from={offset} durationInFrames={section.hold} name={section.key}>
            {section.render(section.hold, featureNo, FEATURE_TOTAL)}
          </Sequence>
        );
        offset += section.hold;
        return seq;
      })}
    </AbsoluteFill>
  );
}
