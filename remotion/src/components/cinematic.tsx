import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import React from 'react';
import { COLORS, FONTS } from '../theme';

/** Reveal text character-by-character at `cps`. Slow + deliberate. */
export function SlowType({
  text,
  delay = 0,
  cps = 14,
  size = 64,
  weight = 600,
  font = FONTS.serif,
  color = COLORS.text,
  letterSpacing = -1,
  lineHeight = 1.1,
  caret = false,
  align = 'left',
}: {
  text: string;
  delay?: number;
  cps?: number;
  size?: number;
  weight?: number;
  font?: string;
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  caret?: boolean;
  align?: 'left' | 'center' | 'right';
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.max(0, frame - delay);
  const charsPerFrame = cps / fps;
  const shown = Math.min(text.length, Math.floor(elapsed * charsPerFrame));
  const caretOn = caret && Math.floor(frame / 14) % 2 === 0 && shown < text.length;
  return (
    <span
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing,
        lineHeight,
        textAlign: align,
        display: 'inline-block',
        whiteSpace: 'pre-wrap',
      }}
    >
      {text.slice(0, shown)}
      {caretOn && <span style={{ color: COLORS.accent, marginLeft: 2 }}>▍</span>}
    </span>
  );
}

/** Wraps children in a slow, continuous scale + drift — adds cinematic life. */
export function KenBurns({
  children,
  from = 1,
  to = 1.08,
  panX = 0,
  panY = 0,
  duration,
}: {
  children: React.ReactNode;
  from?: number;
  to?: number;
  panX?: number;
  panY?: number;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const t = Math.min(1, Math.max(0, frame / duration));
  const scale = from + (to - from) * t;
  const x = panX * t;
  const y = panY * t;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
}

/** A virtual camera — zooms from one transform to another over `duration`. */
export function Camera({
  children,
  fromScale = 1,
  toScale = 1,
  fromX = 0,
  toX = 0,
  fromY = 0,
  toY = 0,
  duration,
  easing = 'easeOut',
}: {
  children: React.ReactNode;
  fromScale?: number;
  toScale?: number;
  fromX?: number;
  toX?: number;
  fromY?: number;
  toY?: number;
  duration: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
}) {
  const frame = useCurrentFrame();
  const t0 = Math.min(1, Math.max(0, frame / duration));
  const t =
    easing === 'easeOut'
      ? 1 - Math.pow(1 - t0, 3)
      : easing === 'easeInOut'
        ? t0 < 0.5
          ? 2 * t0 * t0
          : 1 - Math.pow(-2 * t0 + 2, 2) / 2
        : t0;
  const scale = fromScale + (toScale - fromScale) * t;
  const x = fromX + (toX - fromX) * t;
  const y = fromY + (toY - fromY) * t;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
}

/** Soft spring-up reveal. */
export function Reveal({
  children,
  delay = 0,
  y = 30,
  damping = 18,
  stiffness = 100,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  damping?: number;
  stiffness?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness, mass: 0.7 },
  });
  const opacity = interpolate(frame - delay, [0, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - s) * y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Cross-fade wrapper for the section as a whole. */
export function SoftFade({
  children,
  durationFrames,
  fadeIn = 12,
  fadeOut = 16,
}: {
  children: React.ReactNode;
  durationFrames: number;
  fadeIn?: number;
  fadeOut?: number;
}) {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: 'clamp' });
  const outOp = interpolate(
    frame,
    [durationFrames - fadeOut, durationFrames],
    [1, 0],
    { extrapolateLeft: 'clamp' }
  );
  return <div style={{ opacity: Math.min(inOp, outOp), width: '100%', height: '100%' }}>{children}</div>;
}

/** Drifting halo behind hero sections — adds depth without being noisy. */
export function HaloBackdrop() {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 40;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: COLORS.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `calc(20% + ${drift}px)`,
          top: '15%',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accent}26, transparent 60%)`,
          filter: 'blur(20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: `calc(15% + ${-drift}px)`,
          bottom: '10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.link}1a, transparent 60%)`,
          filter: 'blur(20px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, ${COLORS.borderSubtle} 1px, transparent 1px),
            linear-gradient(to bottom, ${COLORS.borderSubtle} 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          opacity: 0.6,
        }}
      />
    </div>
  );
}
