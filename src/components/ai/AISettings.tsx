import { useEffect, useState } from 'react';
import { RefreshCw, X, ChevronRight } from 'lucide-react';
import { useAI } from '@/stores/ai';
import { useNoteIntelligence, IntelligenceFeature } from '@/stores/noteIntelligence';
import { useVoice, getVoiceHotkey, setVoiceHotkey, DEFAULT_HOTKEY } from '@/stores/voice';
import { api } from '@/lib/api';
import { silentWav } from '@/lib/recorder';
import { cn } from '@/lib/utils';
import type { AIProvider, VoiceEngine } from '@/types';
import { WhisperModelManager } from '@/components/voice/WhisperModelManager';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PROVIDER_LABEL: Record<AIProvider, string> = {
  ollama: 'Ollama',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  bedrock: 'Bedrock',
};

const PROVIDER_HINT: Record<AIProvider, string> = {
  ollama: 'Runs on your machine — free and private. Pick from your installed models.',
  openai: 'Bring your own key from platform.openai.com. Works with Groq, OpenRouter & others too (under Advanced).',
  anthropic: 'Use Claude with a key from console.anthropic.com.',
  bedrock: 'Claude on AWS Bedrock — for teams already on AWS. Uses your IAM access key + secret.',
};

export function AISettings({ open, onClose }: Props) {
  const settings = useAI((s) => s.settings);
  const loadSettings = useAI((s) => s.loadSettings);
  const saveSettings = useAI((s) => s.saveSettings);

  const [section, setSection] = useState<'assistant' | 'intelligence' | 'voice'>('assistant');
  const [provider, setProvider] = useState<AIProvider>('ollama');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Per-provider draft state. We track them all separately so toggling between
  // providers doesn't lose what the user just typed.
  const [ollamaBase, setOllamaBase] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);

  const [openaiBase, setOpenaiBase] = useState('https://api.openai.com/v1');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiHasKey, setOpenaiHasKey] = useState(false);

  const [anthropicBase, setAnthropicBase] = useState('https://api.anthropic.com');
  const [anthropicModel, setAnthropicModel] = useState('claude-sonnet-4-6');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [anthropicHasKey, setAnthropicHasKey] = useState(false);

  const [bedrockRegion, setBedrockRegion] = useState('us-east-1');
  const [bedrockModel, setBedrockModel] = useState('anthropic.claude-3-5-sonnet-20241022-v2:0');
  const [bedrockAccessKey, setBedrockAccessKey] = useState('');
  const [bedrockSecretKey, setBedrockSecretKey] = useState('');
  const [bedrockHasCreds, setBedrockHasCreds] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (open && !settings) loadSettings();
  }, [open, settings, loadSettings]);

  useEffect(() => {
    if (!settings) return;
    // Defensive against an older IPC payload (pre-Bedrock) coming from a stale
    // main-process build: guard every section so a missing field never crashes.
    setProvider(settings.provider ?? 'ollama');
    if (settings.ollama) {
      setOllamaBase(settings.ollama.baseUrl);
      setOllamaModel(settings.ollama.model);
    }
    if (settings.openai) {
      setOpenaiBase(settings.openai.baseUrl);
      setOpenaiModel(settings.openai.model);
      setOpenaiHasKey(settings.openai.hasKey);
      setOpenaiKey('');
    }
    if (settings.anthropic) {
      setAnthropicBase(settings.anthropic.baseUrl);
      setAnthropicModel(settings.anthropic.model);
      setAnthropicHasKey(settings.anthropic.hasKey);
      setAnthropicKey('');
    }
    if (settings.bedrock) {
      setBedrockRegion(settings.bedrock.region);
      setBedrockModel(settings.bedrock.model);
      setBedrockHasCreds(settings.bedrock.hasCreds);
      setBedrockAccessKey('');
      setBedrockSecretKey('');
    }
  }, [settings, open]);

  const refreshOllamaModels = async () => {
    setOllamaLoading(true);
    try {
      const list = await api.ai.listOllamaModels(ollamaBase);
      setOllamaModels(list);
      if (list.length && !list.includes(ollamaModel)) {
        setOllamaModel(list[0]);
      }
    } finally {
      setOllamaLoading(false);
    }
  };

  // Auto-fetch ollama models when the modal opens or when switching to Ollama.
  useEffect(() => {
    if (open && provider === 'ollama') refreshOllamaModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider, ollamaBase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const buildPayload = () => ({
    provider,
    ollama: { baseUrl: ollamaBase, model: ollamaModel },
    openai: {
      baseUrl: openaiBase,
      model: openaiModel,
      // Only send apiKey if the user typed a new one — keeps existing stored key intact.
      ...(openaiKey ? { apiKey: openaiKey } : {}),
    },
    anthropic: {
      baseUrl: anthropicBase,
      model: anthropicModel,
      ...(anthropicKey ? { apiKey: anthropicKey } : {}),
    },
    bedrock: {
      region: bedrockRegion,
      model: bedrockModel,
      ...(bedrockAccessKey ? { accessKeyId: bedrockAccessKey } : {}),
      ...(bedrockSecretKey ? { secretAccessKey: bedrockSecretKey } : {}),
    },
  });

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    const saved = await saveSettings(buildPayload());
    setSaving(false);
    if (saved) onClose();
    else setSaveError('Failed to save. Check the terminal logs.');
  };

  // Test the configured provider with a tiny real request. Saves the current
  // draft first so the probe uses exactly what's on screen.
  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);
    const saved = await saveSettings(buildPayload());
    if (!saved) {
      setTesting(false);
      setTestResult({ ok: false, msg: 'Could not save settings before testing.' });
      return;
    }
    const result = await probeAssistant();
    setTesting(false);
    setTestResult(result);
  };

  const onClearKey = async (which: 'openai' | 'anthropic') => {
    setSaving(true);
    await saveSettings({ [which]: { apiKey: null } });
    setSaving(false);
    if (which === 'openai') {
      setOpenaiHasKey(false);
      setOpenaiKey('');
    } else {
      setAnthropicHasKey(false);
      setAnthropicKey('');
    }
  };

  const onClearBedrockCreds = async () => {
    setSaving(true);
    await saveSettings({ bedrock: { accessKeyId: null, secretAccessKey: null } });
    setSaving(false);
    setBedrockHasCreds(false);
    setBedrockAccessKey('');
    setBedrockSecretKey('');
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[580px] max-w-[94vw] max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border-subtle">
          <div>
            <h2 className="text-[17px] font-semibold text-text">AI Settings</h2>
            <p className="text-[12px] text-text-muted mt-0.5">Configure your writing assistant and voice dictation</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-3">
          {(['assistant', 'intelligence', 'voice'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setSection(sec)}
              className={cn(
                'px-4 py-2 text-[13px] rounded-lg transition-all',
                section === sec
                  ? 'bg-bg-hover text-text font-medium'
                  : 'text-text-muted hover:text-text hover:bg-bg-hover/50'
              )}
            >
              {sec === 'assistant' ? 'Provider' : sec === 'intelligence' ? 'Intelligence' : 'Voice'}
            </button>
          ))}
        </div>

        {section === 'voice' ? (
          <VoiceSection onClose={onClose} />
        ) : section === 'intelligence' ? (
          <IntelligenceSection />
        ) : (
        <>
        {/* Provider selection */}
        <div className="px-6 pt-2 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {(['ollama', 'openai', 'anthropic', 'bedrock'] as AIProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-[12px] transition-all',
                  provider === p
                    ? 'bg-accent-subtle border-accent text-text font-medium'
                    : 'bg-bg border-border text-text-muted hover:border-border hover:bg-bg-hover'
                )}
              >
                <span className="text-[13px] font-medium">{PROVIDER_LABEL[p]}</span>
                <span className="text-[10px] text-text-subtle">
                  {p === 'ollama' ? 'Local' : p === 'openai' ? 'Cloud' : p === 'anthropic' ? 'Cloud' : 'AWS'}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-text-muted leading-relaxed">{PROVIDER_HINT[provider]}</p>
        </div>

        {/* Provider-specific fields */}
        <div className="px-6 py-4 space-y-4 border-t border-border-subtle">
          {provider === 'ollama' && (
            <>
              <Field label="Base URL">
                <input
                  value={ollamaBase}
                  onChange={(e) => setOllamaBase(e.target.value)}
                  className={inputClass}
                  placeholder="http://localhost:11434"
                />
              </Field>
              <Field label="Model">
                <div className="flex gap-2">
                  {ollamaModels.length > 0 ? (
                    <select
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className={cn(inputClass, 'flex-1')}
                    >
                      {!ollamaModels.includes(ollamaModel) && ollamaModel && (
                        <option value={ollamaModel}>{ollamaModel} (not installed)</option>
                      )}
                      {ollamaModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      placeholder="e.g. llama3.2, qwen2.5:7b"
                      className={cn(inputClass, 'flex-1')}
                    />
                  )}
                  <button
                    onClick={refreshOllamaModels}
                    disabled={ollamaLoading}
                    className="px-2.5 py-2 border border-border rounded-md text-text-muted hover:bg-bg-hover hover:text-text disabled:opacity-50 transition-colors"
                    title="Re-detect installed models"
                  >
                    <RefreshCw size={13} className={ollamaLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
                {ollamaModels.length === 0 && !ollamaLoading && (
                  <p className="mt-1.5 text-[11px] text-text-subtle">
                    Couldn't reach Ollama at <code>{ollamaBase}</code>. Make sure it's running
                    (<code>ollama serve</code>) and you have at least one model pulled.
                  </p>
                )}
              </Field>
            </>
          )}

          {provider === 'openai' && (
            <>
              <Field label="API key">
                <KeyInput
                  hasKey={openaiHasKey}
                  value={openaiKey}
                  onChange={setOpenaiKey}
                  onClear={() => onClearKey('openai')}
                  placeholder="sk-..."
                />
              </Field>
              <Field label="Model">
                <input
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className={inputClass}
                  placeholder="gpt-4o-mini"
                />
              </Field>
              <Advanced open={showAdvanced} onToggle={() => setShowAdvanced((v) => !v)}>
                <Field label="API endpoint (Base URL)">
                  <input
                    value={openaiBase}
                    onChange={(e) => setOpenaiBase(e.target.value)}
                    className={inputClass}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="mt-1 text-[10.5px] text-text-subtle">
                    Change only to use a compatible provider (Groq, OpenRouter, LM Studio…).
                  </p>
                </Field>
              </Advanced>
            </>
          )}

          {provider === 'anthropic' && (
            <>
              <Field label="API key">
                <KeyInput
                  hasKey={anthropicHasKey}
                  value={anthropicKey}
                  onChange={setAnthropicKey}
                  onClear={() => onClearKey('anthropic')}
                  placeholder="sk-ant-..."
                />
              </Field>
              <Field label="Model">
                <input
                  value={anthropicModel}
                  onChange={(e) => setAnthropicModel(e.target.value)}
                  className={inputClass}
                  placeholder="claude-sonnet-4-6"
                />
              </Field>
              <Advanced open={showAdvanced} onToggle={() => setShowAdvanced((v) => !v)}>
                <Field label="API endpoint (Base URL)">
                  <input
                    value={anthropicBase}
                    onChange={(e) => setAnthropicBase(e.target.value)}
                    className={inputClass}
                    placeholder="https://api.anthropic.com"
                  />
                </Field>
              </Advanced>
            </>
          )}

          {provider === 'bedrock' && (
            <>
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <Field label="Region">
                  <input
                    value={bedrockRegion}
                    onChange={(e) => setBedrockRegion(e.target.value)}
                    className={inputClass}
                    placeholder="us-east-1"
                  />
                </Field>
                <Field label="Model ID">
                  <input
                    value={bedrockModel}
                    onChange={(e) => setBedrockModel(e.target.value)}
                    className={cn(inputClass, 'font-mono text-[11.5px]')}
                    placeholder="anthropic.claude-3-5-sonnet-20241022-v2:0"
                  />
                </Field>
              </div>
              <Field label="Access key ID">
                <KeyInput
                  hasKey={bedrockHasCreds}
                  value={bedrockAccessKey}
                  onChange={setBedrockAccessKey}
                  onClear={onClearBedrockCreds}
                  placeholder="AKIA…"
                  hideHelp
                />
              </Field>
              <Field label="Secret access key">
                <KeyInput
                  hasKey={bedrockHasCreds}
                  value={bedrockSecretKey}
                  onChange={setBedrockSecretKey}
                  onClear={onClearBedrockCreds}
                  placeholder="••••••••"
                />
              </Field>
              <p className="text-[11px] text-text-subtle leading-snug">
                Tip: create a dedicated IAM user with the <code>AmazonBedrockFullAccess</code> policy
                (or a tighter one limited to <code>bedrock:InvokeModelWithResponseStream</code>) and
                use its keys here.
              </p>
            </>
          )}
        </div>

        {saveError && (
          <div className="mx-6 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-500">{saveError}</div>
        )}

        {testResult && (
          <div className={cn('mx-6 mb-3 px-3 py-2 rounded-lg border text-[12px]', testResult.ok ? 'bg-tag-soft border-tag/20 text-tag' : 'bg-red-500/10 border-red-500/20 text-red-500')}>
            {testResult.ok ? '✓ ' : '✕ '}
            {testResult.msg}
          </div>
        )}

        <div className="flex items-center gap-2 px-6 py-4 border-t border-border-subtle">
          <button
            onClick={onTest}
            disabled={testing || saving}
            className="px-4 py-2 text-[12.5px] font-medium rounded-lg border border-border text-text hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12.5px] rounded-lg text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-[12.5px] font-semibold rounded-lg bg-accent text-bg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

// Fire a tiny generation against the saved Assistant provider and report whether
// it responded. Streaming events are collapsed into a single ok/error result.
function probeAssistant(): Promise<{ ok: boolean; msg: string }> {
  return new Promise((resolve) => {
    const id = `aitest-${Date.now()}`;
    const offChunk = api.ai.onChunk(id, () => {});
    const finish = (r: { ok: boolean; msg: string }) => {
      offChunk();
      offDone();
      offError();
      resolve(r);
    };
    const offDone = api.ai.onDone(id, () => finish({ ok: true, msg: 'Connected — provider responded.' }));
    const offError = api.ai.onError(id, (m) => finish({ ok: false, msg: m }));
    api.ai.generate(id, { system: 'Reply with just: OK', user: 'ping' }).then((res) => {
      if (!res.ok) finish({ ok: false, msg: res.error });
    });
  });
}

const inputClass =
  'w-full px-3.5 py-2.5 text-[13px] rounded-lg bg-bg border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

function Advanced({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="text-[11px] text-text-subtle hover:text-text-muted transition-colors inline-flex items-center gap-1"
      >
        <ChevronRight size={11} className={cn('transition-transform', open && 'rotate-90')} />
        Advanced
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-medium text-text-muted mb-2">
        {label}
      </div>
      {children}
    </label>
  );
}

const VOICE_ENGINE_HINT: Record<VoiceEngine, string> = {
  cloud:
    'Best accuracy. OpenAI-compatible — works with OpenAI (gpt-4o-transcribe) or, by editing the base URL, Groq (whisper-large-v3-turbo) and others. Audio is sent to the endpoint.',
  local:
    'Fully offline and private. Download a Whisper model below, then install whisper-cpp (brew install whisper-cpp). Audio never leaves your machine.',
};

function VoiceSection({ onClose }: { onClose: () => void }) {
  const settings = useVoice((s) => s.settings);
  const loadSettings = useVoice((s) => s.loadSettings);
  const saveSettings = useVoice((s) => s.saveSettings);

  const [engine, setEngine] = useState<VoiceEngine>('cloud');
  const [cloudBase, setCloudBase] = useState('https://api.openai.com/v1');
  const [cloudModel, setCloudModel] = useState('gpt-4o-transcribe');
  const [cloudKey, setCloudKey] = useState('');
  const [cloudHasKey, setCloudHasKey] = useState(false);
  const [localModel, setLocalModel] = useState('Xenova/whisper-base.en');
  const [language, setLanguage] = useState('');
  const [vocab, setVocab] = useState('');
  const [cleanup, setCleanup] = useState(true);
  const [hotkey, setHotkey] = useState(getVoiceHotkey());
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!settings) loadSettings();
  }, [settings, loadSettings]);

  useEffect(() => {
    if (!settings) return;
    setEngine(settings.engine);
    setCloudBase(settings.cloud.baseUrl);
    setCloudModel(settings.cloud.model);
    setCloudHasKey(settings.cloud.hasKey);
    setCloudKey('');
    setLocalModel(settings.local.model);
    setLanguage(settings.language);
    setVocab(settings.vocab);
    setCleanup(settings.cleanup);
  }, [settings]);

  const persist = () => {
    setVoiceHotkey(hotkey);
    return saveSettings({
      engine,
      cloud: { baseUrl: cloudBase, model: cloudModel, ...(cloudKey ? { apiKey: cloudKey } : {}) },
      local: { model: localModel },
      language,
      vocab,
      cleanup,
    });
  };

  const onSave = async () => {
    setSaving(true);
    await persist();
    setSaving(false);
    onClose();
  };

  // Probe the speech-to-text endpoint with a short silent clip — validates base
  // URL + key + model without the user having to speak. Local engine just
  // confirms it'll download the model on first real use.
  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    const saved = await persist();
    if (!saved) {
      setTesting(false);
      setTestResult({ ok: false, msg: 'Could not save settings before testing.' });
      return;
    }
    if (engine === 'local') {
      setTesting(false);
      setTestResult({ ok: true, msg: 'Local engine downloads the model on first dictation.' });
      return;
    }
    const res = await api.voice.transcribe(`vtest-${Date.now()}`, {
      kind: 'cloud',
      audio: silentWav(0.3),
      mimeType: 'audio/wav',
    });
    setTesting(false);
    setTestResult(res.ok ? { ok: true, msg: 'Connected — endpoint accepted the request.' } : { ok: false, msg: res.error });
  };

  return (
    <>
      <div className="px-5 pt-4 pb-2">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle mb-2">
          Engine
        </div>
        <div className="flex gap-1 p-1 rounded-md bg-bg border border-border">
          {(['cloud', 'local'] as VoiceEngine[]).map((e) => (
            <button
              key={e}
              onClick={() => setEngine(e)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded text-[12.5px] transition-colors capitalize',
                engine === e
                  ? 'bg-bg-elevated text-text font-medium shadow-sm'
                  : 'text-text-muted hover:text-text'
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-text-subtle leading-snug">{VOICE_ENGINE_HINT[engine]}</p>
      </div>

      <div className="px-5 py-4 space-y-4 border-t border-border-subtle">
        {engine === 'cloud' ? (
          <>
            <Field label="Base URL">
              <input
                value={cloudBase}
                onChange={(e) => setCloudBase(e.target.value)}
                className={inputClass}
                placeholder="https://api.openai.com/v1"
              />
            </Field>
            <Field label="Model">
              <input
                value={cloudModel}
                onChange={(e) => setCloudModel(e.target.value)}
                className={inputClass}
                placeholder="gpt-4o-transcribe"
              />
            </Field>
            <Field label="API key">
              <KeyInput
                hasKey={cloudHasKey}
                value={cloudKey}
                onChange={setCloudKey}
                onClear={async () => {
                  await saveSettings({ cloud: { apiKey: null } });
                  setCloudHasKey(false);
                  setCloudKey('');
                }}
                placeholder="sk-…"
              />
            </Field>
          </>
        ) : (
          <WhisperModelManager
            selectedModel={localModel}
            onSelect={(id) => setLocalModel(id)}
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Language">
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={inputClass}
              placeholder="auto (e.g. en)"
            />
          </Field>
          <Field label="Hold-to-talk key">
            <button
              type="button"
              data-voice-rebind="true"
              onKeyDown={(e) => {
                if (!capturing) return;
                e.preventDefault();
                if (e.key !== 'Escape') setHotkey(e.key);
                setCapturing(false);
              }}
              onClick={() => setCapturing(true)}
              className={cn(inputClass, 'text-left', capturing && 'ring-1 ring-accent border-accent')}
            >
              {capturing ? 'Press a key…' : <span className="font-mono">{hotkey || DEFAULT_HOTKEY}</span>}
            </button>
          </Field>
        </div>

        <Field label="Vocabulary hints">
          <textarea
            value={vocab}
            onChange={(e) => setVocab(e.target.value)}
            rows={2}
            className={cn(inputClass, 'resize-none')}
            placeholder="Names, jargon, acronyms to spell correctly — e.g. Koushith, Reclaim Protocol, zkTLS"
          />
        </Field>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={cleanup}
            onChange={(e) => setCleanup(e.target.checked)}
            className="accent-accent"
          />
          <span className="text-[12.5px] text-text">Polish with AI</span>
          <span className="text-[11px] text-text-subtle">
            — remove fillers & punctuate using your Assistant provider
          </span>
        </label>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t border-border-subtle">
        <button
          onClick={onTest}
          disabled={testing || saving}
          className="px-3 py-1.5 text-[12.5px] rounded-md border border-border text-text-muted hover:text-text hover:bg-bg-hover transition-colors disabled:opacity-50"
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        {testResult && (
          <span className={cn('text-[11.5px] truncate', testResult.ok ? 'text-emerald-500' : 'text-red-500')}>
            {testResult.ok ? '✓ ' : '✕ '}
            {testResult.msg}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[12.5px] rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-1.5 text-[12.5px] font-medium rounded-md bg-accent text-bg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </>
  );
}

function KeyInput({
  hasKey,
  value,
  onChange,
  onClear,
  placeholder,
  hideHelp,
}: {
  hasKey: boolean;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  placeholder: string;
  hideHelp?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasKey ? '•••••••••• (saved, leave blank to keep)' : placeholder}
          className={cn(inputClass, 'flex-1 font-mono')}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          onClick={() => setShow((v) => !v)}
          type="button"
          className="px-2.5 py-2 text-[11px] border border-border rounded-md text-text-muted hover:text-text hover:bg-bg-hover transition-colors"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {hasKey && (
        <button
          onClick={onClear}
          type="button"
          className="text-[11px] text-red-500 hover:underline"
        >
          Clear saved key
        </button>
      )}
      {!hideHelp && (
        <p className="text-[10.5px] text-text-subtle leading-snug">
          Stored encrypted on disk via your OS keychain. Never sent anywhere except the configured endpoint.
        </p>
      )}
    </div>
  );
}

const FEATURE_LABELS: Record<IntelligenceFeature, { name: string; desc: string }> = {
  autoTag: { name: 'Auto-tag', desc: 'Suggest tags based on note content' },
  smartTitle: { name: 'Smart title', desc: 'Suggest a title for untitled notes' },
  extractTodos: { name: 'Extract action items', desc: 'Detect todos in meeting notes and lists' },
  linkSuggestions: { name: 'Link suggestions', desc: 'Surface related notes in your vault' },
  continueWriting: { name: 'Continue writing', desc: 'Suggest a continuation when you pause' },
};

function IntelligenceSection() {
  const enabled = useNoteIntelligence((s) => s.enabled);
  const setEnabled = useNoteIntelligence((s) => s.setEnabled);
  const features = useNoteIntelligence((s) => s.features);
  const setFeature = useNoteIntelligence((s) => s.setFeature);

  return (
    <div className="px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-medium text-text">Background Intelligence</div>
          <div className="text-[12px] text-text-muted mt-0.5">
            Your notes app learns from what you write and surfaces useful context.
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-bg-hover peer-focus:ring-2 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-text-subtle after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-bg" />
        </label>
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t border-border-subtle">
          {(Object.keys(FEATURE_LABELS) as IntelligenceFeature[]).map((key) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={(e) => setFeature(key, e.target.checked)}
                className="mt-0.5 accent-accent"
              />
              <div>
                <div className="text-[13px] text-text font-medium group-hover:text-accent transition-colors">
                  {FEATURE_LABELS[key].name}
                </div>
                <div className="text-[11.5px] text-text-muted leading-snug">
                  {FEATURE_LABELS[key].desc}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {!enabled && (
        <div className="bg-bg rounded-lg border border-border p-4 text-[12px] text-text-muted leading-relaxed">
          When enabled, the intelligence layer watches your notes as you write and quietly surfaces suggestions: tags, titles, related notes, action items, and writing continuations. All processing goes through your configured AI provider. Nothing is stored externally.
        </div>
      )}
    </div>
  );
}
