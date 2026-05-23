import { AbsoluteFill, Img, staticFile } from 'remotion';
import { COLORS, FONTS } from '../theme';

interface DribbbleShotProps {
  /** Path under public/ — e.g. 'shots/raw/02-daily.png'. */
  src: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Accent for the eyebrow + decorative halos. */
  tone?: 'accent' | 'tag' | 'link';
  /** Override the rotation / scale of the screenshot. */
  tilt?: number;
}

/** Publishable 2400×1800 Dribbble-style shot. Carbon-themed gradient background,
 *  big macOS-window-framed screenshot, marketing eyebrow / title / subtitle. */
export function DribbbleShot({
  src,
  eyebrow,
  title,
  subtitle,
  tone = 'accent',
  tilt = 0,
}: DribbbleShotProps) {
  const toneColor =
    tone === 'tag' ? COLORS.tag : tone === 'link' ? COLORS.link : COLORS.accent;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      {/* Backdrop: dual halos + subtle grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 22% 18%, rgba(196, 177, 255, 0.18) 0px, transparent 520px),
            radial-gradient(circle at 78% 82%, rgba(125, 211, 252, 0.12) 0px, transparent 540px),
            linear-gradient(180deg, ${COLORS.bg} 0%, #0d0d11 100%)
          `,
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
          backgroundSize: '72px 72px',
          opacity: 0.5,
        }}
      />

      {/* Top eyebrow + title block */}
      <div
        style={{
          position: 'absolute',
          top: 110,
          left: 130,
          right: 130,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 60,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONTS.mono,
              fontSize: 22,
              letterSpacing: 7,
              color: toneColor,
              textTransform: 'uppercase',
              marginBottom: 22,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: FONTS.serif,
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1.02,
              color: COLORS.text,
              maxWidth: 1500,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                marginTop: 22,
                fontFamily: FONTS.serif,
                fontStyle: 'italic',
                fontSize: 32,
                color: COLORS.textMuted,
                maxWidth: 1500,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Brand badge top-right */}
      <div
        style={{
          position: 'absolute',
          top: 110,
          right: 130,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            background: COLORS.text,
            color: COLORS.bg,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONTS.serif,
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 32,
          }}
        >
          S
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, color: COLORS.text }}>
            SideNotes
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 3, color: COLORS.textMuted, textTransform: 'uppercase' }}>
            v0.3.0
          </div>
        </div>
      </div>

      {/* The screenshot, framed as a macOS window */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 180,
          transform: `translateX(-50%) rotate(${tilt}deg)`,
          width: 1980,
          aspectRatio: '16 / 9',
          borderRadius: 18,
          overflow: 'hidden',
          background: COLORS.bgElevated,
          border: `1px solid ${COLORS.border}`,
          boxShadow: `
            0 60px 140px rgba(0, 0, 0, 0.55),
            0 30px 60px rgba(0, 0, 0, 0.35),
            0 0 0 1px rgba(255, 255, 255, 0.04) inset
          `,
        }}
      >
        {/* Title bar */}
        <div
          style={{
            position: 'relative',
            height: 36,
            background: '#1a1a1d',
            borderBottom: `1px solid ${COLORS.borderSubtle}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 16,
            gap: 8,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#ff5f57' }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#febc2e' }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#28c840' }} />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: FONTS.mono,
              fontSize: 12,
              letterSpacing: 2,
              color: COLORS.textSubtle,
            }}
          >
            sidenotes.me
          </span>
        </div>
        {/* The captured screenshot */}
        <Img
          src={staticFile(src)}
          style={{
            width: '100%',
            height: 'calc(100% - 36px)',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
        />
      </div>

      {/* Footer eyebrow */}
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONTS.mono,
          fontSize: 16,
          letterSpacing: 6,
          color: COLORS.textSubtle,
          textTransform: 'uppercase',
        }}
      >
        sidenotes.me · plain markdown · runs offline · privacy first
      </div>
    </AbsoluteFill>
  );
}
