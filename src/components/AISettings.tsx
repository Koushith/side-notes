import { useEffect, useState } from 'react';
import { RefreshCw, X, ChevronRight } from 'lucide-react';
import { useAI } from '@/stores/ai';
import { useVoice, getVoiceHotkey, setVoiceHotkey, DEFAULT_HOTKEY } from '@/stores/voice';
import { api } from '@/lib/api';
import { silentWav } from '@/lib/recorder';
import { cn } from '@/lib/utils';
import type { AIProvider, VoiceEngine } from '@/types';

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

  const [section, setSection] = useState<'assistant' | 'voice'>('assistant');
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
        className="w-[560px] max-w-[94vw] max-h-[88vh] overflow-y-auto rounded-xl border border-border bg-bg-elevated shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <h2 className="font-serif text-[15px] font-semibold text-text">AI settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-hover"
          >
            <X size={14} />
          </button>
        </div>

        {/* Section tabs: text assistant vs voice dictation */}
        <div className="flex gap-4 px-5 pt-3 border-b border-border-subtle">
          {(['assistant', 'voice'] as const).map((sec) => (
            <button
              key={sec}
              onClick={() => setSection(sec)}
              className={cn(
                'pb-2 text-[12.5px] border-b-2 -mb-px transition-colors',
                section === sec
                  ? 'border-accent text-text font-medium'
                  : 'border-transparent text-text-muted hover:text-text'
              )}
            >
              {sec === 'assistant' ? 'Assistant' : 'Voice'}
            </button>
          ))}
        </div>

        {section === 'voice' ? (
          <VoiceSection onClose={onClose} />
        ) : (
        <>
        {/* Provider tabs */}
        <div className="px-5 pt-4 pb-2">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle mb-2">
            Provider
          </div>
          <div className="flex gap-1 p-1 rounded-md bg-bg border border-border">
            {(['ollama', 'openai', 'anthropic', 'bedrock'] as AIProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={cn(
                  'flex-1 px-3 py-1.5 rounded text-[12.5px] transition-colors',
                  provider === p
                    ? 'bg-bg-elevated text-text font-medium shadow-sm'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {PROVIDER_LABEL[p]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-text-subtle leading-snug">{PROVIDER_HINT[provider]}</p>
        </div>

        {/* Provider-specific fields */}
        <div className="px-5 py-4 space-y-4 border-t border-border-subtle">
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
          <div className="px-5 pb-2 text-[12px] text-red-500">{saveError}</div>
        )}

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
  'w-full px-2.5 py-2 text-[12.5px] rounded-md bg-bg border border-border outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

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
      <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-text-subtle mb-1.5">
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
    'Runs Whisper on your machine via Transformers.js — fully offline and private. First use downloads the model. Slower, and requires `npm install @huggingface/transformers`.',
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
          <Field label="Model">
            <input
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className={cn(inputClass, 'font-mono text-[11.5px]')}
              placeholder="Xenova/whisper-base.en"
            />
            <p className="mt-1.5 text-[11px] text-text-subtle leading-snug">
              Try <code>Xenova/whisper-tiny.en</code> (fastest) up to{' '}
              <code>Xenova/whisper-small.en</code> (more accurate). Drop the <code>.en</code> for
              multilingual. Requires <code>npm install @huggingface/transformers</code>.
            </p>
          </Field>
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
