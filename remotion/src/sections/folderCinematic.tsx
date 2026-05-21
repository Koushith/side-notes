import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { COLORS, FONTS } from '../theme';
import { Camera, KenBurns, SlowType, HaloBackdrop, Reveal, SoftFade } from '../components/cinematic';

/** Cinematic centerpiece: dolly-out from a single dated file to reveal the flat
 *  vault layout, then fade in the virtual Year/Month sidebar overlay. */
export function FolderCinematic({ durationFrames }: { durationFrames: number }) {
  const frame = useCurrentFrame();

  // Beats inside this section:
  // 0-50:    one filename types out, camera locked very close (scale 3.0)
  // 50-130:  camera pulls back to scale 1.6, more files materialize
  // 130-200: pull to scale 1.0 — full Daily Notes folder visible
  // 200-260: tag-line types: "Files stay flat on disk."
  // 260-end: virtual Year/Month sidebar overlay drifts in from the right
  //          + tag-line: "The sidebar groups them for you."

  // Synthesize the 12-file streak.
  const files = [
    '2026-05-11.md',
    '2026-05-12.md',
    '2026-05-13.md',
    '2026-05-14.md',
    '2026-05-15.md',
    '2026-05-16.md',
    '2026-05-17.md',
    '2026-05-18.md',
    '2026-05-19.md',
    '2026-05-20.md',
    '2026-05-21.md',
    '2026-05-22.md',
  ];

  // Phase ramps
  const cameraT = interpolate(frame, [0, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = 3 - cameraT * 2; // 3.0 → 1.0
  const sidebarT = interpolate(frame, [240, 320], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SoftFade durationFrames={durationFrames}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: COLORS.bg, overflow: 'hidden' }}>
        <HaloBackdrop />

        {/* Stage: 12 file cards laid flat. Camera dollies out by scaling the stage. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${scale})`,
            transformOrigin: '50% 45%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Daily Notes folder wrapper — visible once camera pulls back enough */}
          <div
            style={{
              position: 'relative',
              padding: '52px 56px 56px 56px',
              borderRadius: 24,
              border: `2px solid ${COLORS.border}`,
              background: COLORS.bgElevated,
              boxShadow: `0 60px 120px rgba(0,0,0,0.5)`,
              opacity: interpolate(frame, [80, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            {/* Folder label */}
            <div
              style={{
                position: 'absolute',
                top: -24,
                left: 32,
                padding: '6px 14px',
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontFamily: FONTS.mono,
                fontSize: 14,
                letterSpacing: 2,
                color: COLORS.accent,
                textTransform: 'uppercase',
              }}
            >
              📁 Daily Notes
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))',
                gap: 16,
              }}
            >
              {files.map((name, i) => {
                // The first file types out at the start (very close zoom).
                // Subsequent files materialize in a stagger as the camera pulls back.
                const isFirst = i === 0;
                const opacity = isFirst
                  ? interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
                  : interpolate(frame, [40 + i * 6, 60 + i * 6], [0, 1], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    });
                const y = interpolate(frame, [40 + i * 6, 70 + i * 6], [12, 0], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                return (
                  <div
                    key={name}
                    style={{
                      padding: '18px 22px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.borderSubtle}`,
                      borderRadius: 10,
                      opacity,
                      transform: `translateY(${y}px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 14,
                          height: 18,
                          borderRadius: 2,
                          background: COLORS.bgHover,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: FONTS.mono,
                          fontSize: 18,
                          color: i === files.length - 1 ? COLORS.accentInk : COLORS.text,
                        }}
                      >
                        {isFirst ? (
                          <SlowType text={name} cps={9} size={18} font={FONTS.mono} color={COLORS.text} letterSpacing={0} />
                        ) : (
                          name
                        )}
                      </div>
                    </div>
                    {/* Faux metadata line */}
                    <div
                      style={{
                        height: 4,
                        background: COLORS.borderSubtle,
                        borderRadius: 2,
                        width: `${60 + ((i * 13) % 30)}%`,
                      }}
                    />
                    <div
                      style={{
                        height: 4,
                        background: COLORS.borderSubtle,
                        borderRadius: 2,
                        width: `${40 + ((i * 17) % 30)}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tagline 1: appears after the dolly settles */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 140,
            display: 'flex',
            justifyContent: 'center',
            opacity: interpolate(frame, [205, 235], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            // Fade tagline 1 out as tagline 2 fades in
            ...(frame > 250
              ? {
                  opacity: interpolate(frame, [250, 280], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
                }
              : {}),
          }}
        >
          <SlowType
            text="Files stay flat on disk."
            delay={210}
            cps={20}
            size={48}
            font={FONTS.serif}
            color={COLORS.text}
            letterSpacing={-1}
          />
        </div>

        {/* Tagline 2 + sidebar overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            background: COLORS.bgElevated,
            borderLeft: `1px solid ${COLORS.border}`,
            padding: '60px 28px',
            opacity: sidebarT,
            transform: `translateX(${(1 - sidebarT) * 60}px)`,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 3, color: COLORS.accent, textTransform: 'uppercase', marginBottom: 18 }}>
            Sidebar
          </div>
          <SidebarTree frame={frame - 240} />
        </div>

        <div
          style={{
            position: 'absolute',
            left: 80,
            bottom: 80,
            opacity: interpolate(frame, [280, 320], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          <SlowType
            text="The sidebar groups them for you."
            delay={285}
            cps={22}
            size={42}
            font={FONTS.serif}
            color={COLORS.text}
            letterSpacing={-1}
          />
        </div>
      </div>
    </SoftFade>
  );
}

function SidebarTree({ frame }: { frame: number }) {
  const rows = [
    { depth: 0, icon: '📁', text: 'Daily Notes', muted: false, accent: false },
    { depth: 1, icon: '▾', text: '2026', muted: true, accent: false },
    { depth: 2, icon: '▾', text: 'May', muted: true, accent: false },
    { depth: 3, icon: '•', text: '2026-05-22', muted: false, accent: true },
    { depth: 3, icon: '•', text: '2026-05-21', muted: false, accent: false },
    { depth: 3, icon: '•', text: '2026-05-20', muted: false, accent: false },
    { depth: 3, icon: '•', text: '… 9 more', muted: true, accent: false },
    { depth: 2, icon: '▸', text: 'April', muted: true, accent: false },
    { depth: 2, icon: '▸', text: 'March', muted: true, accent: false },
    { depth: 1, icon: '▸', text: '2025', muted: true, accent: false },
  ];
  return (
    <div style={{ fontFamily: FONTS.mono, fontSize: 17, lineHeight: 1.9 }}>
      {rows.map((row, i) => {
        const opacity = interpolate(frame, [10 + i * 6, 24 + i * 6], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const x = interpolate(frame, [10 + i * 6, 26 + i * 6], [-6, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const color = row.accent ? COLORS.accentInk : row.muted ? COLORS.textMuted : COLORS.text;
        return (
          <div
            key={i}
            style={{
              paddingLeft: row.depth * 18,
              opacity,
              transform: `translateX(${x}px)`,
              color,
            }}
          >
            {row.icon} {row.text}
          </div>
        );
      })}
    </div>
  );
}
