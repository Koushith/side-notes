import { AbsoluteFill } from 'remotion';
import React from 'react';
import { COLORS, FONTS } from '../theme';

// Same publishable 2400x1800 Dribbble frame as template.tsx, but the window body
// holds a hand-built mock instead of a screenshot. Used for screens that are hard
// to capture live (voice recording mid-flight, the settings modal, etc.).
type Tone = 'accent' | 'tag' | 'link';

function Frame({
  eyebrow,
  title,
  subtitle,
  tone = 'accent',
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
  children: React.ReactNode;
}) {
  const toneColor = tone === 'tag' ? COLORS.tag : tone === 'link' ? COLORS.link : COLORS.accent;
  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 22% 18%, rgba(196,177,255,0.18) 0px, transparent 520px), radial-gradient(circle at 78% 82%, rgba(125,211,252,0.12) 0px, transparent 540px), linear-gradient(180deg, ${COLORS.bg} 0%, #0d0d11 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right, ${COLORS.borderSubtle} 1px, transparent 1px), linear-gradient(to bottom, ${COLORS.borderSubtle} 1px, transparent 1px)`, backgroundSize: '72px 72px', opacity: 0.5 }} />

      <div style={{ position: 'absolute', top: 110, left: 130, right: 130 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 22, letterSpacing: 7, color: toneColor, textTransform: 'uppercase', marginBottom: 22 }}>{eyebrow}</div>
        <div style={{ fontFamily: FONTS.serif, fontSize: 96, fontWeight: 600, letterSpacing: -3, lineHeight: 1.02, color: COLORS.text, maxWidth: 1500 }}>{title}</div>
        {subtitle && <div style={{ marginTop: 22, fontFamily: FONTS.serif, fontStyle: 'italic', fontSize: 32, color: COLORS.textMuted, maxWidth: 1500, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>

      <div style={{ position: 'absolute', top: 110, right: 130, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, background: COLORS.text, color: COLORS.bg, borderRadius: 12, display: 'grid', placeItems: 'center', fontFamily: FONTS.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 32 }}>S</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: FONTS.serif, fontSize: 22, fontWeight: 600, letterSpacing: -0.5, color: COLORS.text }}>SideNotes</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 13, letterSpacing: 3, color: COLORS.textMuted, textTransform: 'uppercase' }}>v0.4.0</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: '50%', bottom: 180, transform: 'translateX(-50%)', width: 1980, aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden', background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, boxShadow: '0 60px 140px rgba(0,0,0,0.55), 0 30px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset' }}>
        <div style={{ position: 'relative', height: 36, background: '#1a1a1d', borderBottom: `1px solid ${COLORS.borderSubtle}`, display: 'flex', alignItems: 'center', paddingLeft: 16, gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#ff5f57' }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#febc2e' }} />
          <span style={{ width: 12, height: 12, borderRadius: 999, background: '#28c840' }} />
          <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontFamily: FONTS.mono, fontSize: 12, letterSpacing: 2, color: COLORS.textSubtle }}>sidenotes.me</span>
        </div>
        <div style={{ height: 'calc(100% - 36px)', position: 'relative', overflow: 'hidden' }}>{children}</div>
      </div>

      <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', fontFamily: FONTS.mono, fontSize: 16, letterSpacing: 6, color: COLORS.textSubtle, textTransform: 'uppercase' }}>
        sidenotes.me · plain markdown · runs offline · privacy first
      </div>
    </AbsoluteFill>
  );
}

// ---- Panels (static, full-state) ------------------------------------------

// AI config / settings modal over a dimmed app.
function ConfigPanel() {
  const providers = ['Ollama', 'OpenAI', 'Anthropic', 'Bedrock'];
  return (
    <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', fontFamily: FONTS.sans }}>
      <div style={{ width: 720, borderRadius: 18, border: `1px solid ${COLORS.border}`, background: COLORS.bgElevated, boxShadow: '0 50px 120px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${COLORS.borderSubtle}`, fontFamily: FONTS.serif, fontWeight: 600, fontSize: 24, color: COLORS.text }}>AI settings</div>
        <div style={{ display: 'flex', gap: 28, padding: '18px 28px 0', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
          <span style={{ fontSize: 20, color: COLORS.text, fontWeight: 600, borderBottom: `2px solid ${COLORS.accent}`, paddingBottom: 12 }}>Assistant</span>
          <span style={{ fontSize: 20, color: COLORS.textMuted, paddingBottom: 12 }}>Voice</span>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle, marginBottom: 12 }}>PROVIDER</div>
          <div style={{ display: 'flex', gap: 6, padding: 6, borderRadius: 12, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
            {providers.map((p, i) => (
              <span key={p} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 8, fontSize: 18, color: i === 2 ? COLORS.text : COLORS.textMuted, background: i === 2 ? COLORS.bgElevated : 'transparent', fontWeight: i === 2 ? 600 : 400 }}>{p}</span>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 16, color: COLORS.textSubtle, lineHeight: 1.5 }}>Use Claude with a key from console.anthropic.com.</p>
          <div style={{ marginTop: 22, fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle }}>API KEY</div>
          <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontFamily: FONTS.mono, fontSize: 18, color: COLORS.textMuted }}>sk-ant-••••••••••••••••••••</div>
          <div style={{ marginTop: 18, fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle }}>MODEL</div>
          <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 18, color: COLORS.text }}>claude-sonnet-4-6</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 26 }}>
            <span style={{ padding: '12px 18px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 17, color: COLORS.textMuted }}>Test connection</span>
            <span style={{ fontSize: 17, color: COLORS.tag }}>✓ Connected</span>
            <span style={{ marginLeft: 'auto', padding: '12px 28px', borderRadius: 10, background: COLORS.accent, color: COLORS.bg, fontSize: 17, fontWeight: 600 }}>Save</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Voice dictation, zoomed in on the recording pill.
function VoiceZoomPanel() {
  const BARS = 38;
  return (
    <div style={{ width: '100%', height: '100%', background: `radial-gradient(circle at 50% 60%, ${COLORS.bgElevated} 0%, ${COLORS.bg} 70%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 44, fontFamily: FONTS.sans }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 20, letterSpacing: 4, color: COLORS.textSubtle, textTransform: 'uppercase' }}>Listening</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30, background: COLORS.bgElevated, border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: '34px 48px', boxShadow: '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(196,177,255,0.08)' }}>
        <span style={{ position: 'relative', width: 40, height: 40, display: 'grid', placeItems: 'center' }}>
          <span style={{ position: 'absolute', inset: -6, borderRadius: 999, background: '#ef4444', opacity: 0.22 }} />
          <span style={{ width: 22, height: 22, borderRadius: 999, background: '#ef4444' }} />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 90 }}>
          {Array.from({ length: BARS }).map((_, i) => {
            const h = 12 + (Math.sin(i * 0.55) * 0.5 + 0.5) * 78;
            return <span key={i} style={{ width: 6, height: h, borderRadius: 999, background: COLORS.accent, opacity: 0.45 + (h / 90) * 0.55 }} />;
          })}
        </div>
        <span style={{ width: 64, height: 64, borderRadius: 999, background: COLORS.accent, display: 'grid', placeItems: 'center', color: COLORS.bg, fontSize: 28 }}>●</span>
      </div>
      <div style={{ fontFamily: FONTS.serif, fontSize: 30, color: COLORS.textMuted, fontStyle: 'italic' }}>"ship the voice feature today, then write the update"</div>
    </div>
  );
}

// Source Control panel, redesigned, full-width.
function SourceControlPanel() {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: FONTS.sans }}>
      <div style={{ flex: 1, background: COLORS.bg }} />
      <div style={{ width: 560, borderLeft: `1px solid ${COLORS.borderSubtle}`, background: COLORS.bg, padding: 0 }}>
        <div style={{ padding: '28px 30px', borderBottom: `1px solid ${COLORS.borderSubtle}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: COLORS.textMuted, fontSize: 20 }}>⎇</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 20, color: COLORS.text }}>main</span>
          <span style={{ marginLeft: 'auto', fontSize: 17, color: COLORS.tag }}>✓ Up to date</span>
        </div>
        <div style={{ padding: 30 }}>
          <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bgElevated, fontSize: 17, color: COLORS.textMuted, minHeight: 64 }}>Ship voice + drawings</div>
          <div style={{ marginTop: 16, padding: '16px 0', borderRadius: 10, background: COLORS.accent, color: COLORS.bg, textAlign: 'center', fontWeight: 600, fontSize: 20 }}>↑ Push 2 commits to GitHub</div>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[['voice.ts', 'M'], ['ExcalidrawView.tsx', 'M'], ['ideas.excalidraw', 'A']].map(([f, s]) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ color: COLORS.textSubtle, fontSize: 18 }}>▢</span>
                <span style={{ fontSize: 18, color: COLORS.text }}>{f}</span>
                <span style={{ marginLeft: 'auto', fontFamily: FONTS.mono, fontSize: 16, color: s === 'A' ? COLORS.tag : COLORS.accent }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Voice settings tab (engine, model, hotkey, vocabulary).
function VoiceSettingsPanel() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.45)', display: 'grid', placeItems: 'center', fontFamily: FONTS.sans }}>
      <div style={{ width: 720, borderRadius: 18, border: `1px solid ${COLORS.border}`, background: COLORS.bgElevated, boxShadow: '0 50px 120px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${COLORS.borderSubtle}`, fontFamily: FONTS.serif, fontWeight: 600, fontSize: 24, color: COLORS.text }}>AI settings</div>
        <div style={{ display: 'flex', gap: 28, padding: '18px 28px 0', borderBottom: `1px solid ${COLORS.borderSubtle}` }}>
          <span style={{ fontSize: 20, color: COLORS.textMuted, paddingBottom: 12 }}>Assistant</span>
          <span style={{ fontSize: 20, color: COLORS.text, fontWeight: 600, borderBottom: `2px solid ${COLORS.accent}`, paddingBottom: 12 }}>Voice</span>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle, marginBottom: 12 }}>ENGINE</div>
          <div style={{ display: 'flex', gap: 6, padding: 6, borderRadius: 12, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
            {['Cloud', 'Local'].map((p, i) => (
              <span key={p} style={{ flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: 8, fontSize: 18, color: i === 0 ? COLORS.text : COLORS.textMuted, background: i === 0 ? COLORS.bgElevated : 'transparent', fontWeight: i === 0 ? 600 : 400 }}>{p}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 22 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle }}>MODEL</div>
              <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 17, color: COLORS.text }}>gpt-4o-transcribe</div>
            </div>
            <div style={{ width: 200 }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle }}>HOLD-TO-TALK</div>
              <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontFamily: FONTS.mono, fontSize: 17, color: COLORS.text }}>F2</div>
            </div>
          </div>
          <div style={{ marginTop: 22, fontFamily: FONTS.mono, fontSize: 14, letterSpacing: 2, color: COLORS.textSubtle }}>VOCABULARY HINTS</div>
          <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: COLORS.bg, fontSize: 16, color: COLORS.textMuted, minHeight: 56 }}>Koushith, Reclaim Protocol, zkTLS</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, fontSize: 17, color: COLORS.text }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: COLORS.accent, display: 'grid', placeItems: 'center', color: COLORS.bg, fontSize: 12 }}>✓</span>
            Polish with AI
          </label>
        </div>
      </div>
    </div>
  );
}

const PANELS: Record<string, React.FC> = {
  config: ConfigPanel,
  voice: VoiceZoomPanel,
  'source-control': SourceControlPanel,
  'voice-settings': VoiceSettingsPanel,
};

export interface MockShotConfig {
  id: string;
  kind: keyof typeof PANELS;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone?: Tone;
}

export const MOCK_SHOTS: MockShotConfig[] = [
  {
    id: 'shot-ai-config',
    kind: 'config',
    eyebrow: 'Bring your own model',
    title: 'Local or cloud. Your call.',
    subtitle: 'Ollama, OpenAI, Anthropic, or Bedrock. Test the connection before you rely on it.',
    tone: 'accent',
  },
  {
    id: 'shot-voice',
    kind: 'voice',
    eyebrow: 'Voice dictation',
    title: 'Hold a key. Just talk.',
    subtitle: 'Cloud accuracy or fully-offline Whisper, cleaned up and dropped at your cursor.',
    tone: 'link',
  },
  {
    id: 'shot-source-control',
    kind: 'source-control',
    eyebrow: 'Source control',
    title: 'Commit and push, in a click.',
    subtitle: 'Live status, one-tap commit, a clear push to GitHub, and plain-English errors.',
    tone: 'tag',
  },
  {
    id: 'shot-voice-settings',
    kind: 'voice-settings',
    eyebrow: 'Voice, your way',
    title: 'Cloud or offline. You pick.',
    subtitle: 'Choose the engine, set a push-to-talk key, and teach it your vocabulary.',
    tone: 'accent',
  },
];

export function MockDribbbleShot({ kind, eyebrow, title, subtitle, tone }: Omit<MockShotConfig, 'id'>) {
  const Panel = PANELS[kind];
  return (
    <Frame eyebrow={eyebrow} title={title} subtitle={subtitle} tone={tone}>
      <Panel />
    </Frame>
  );
}
