"use client";

import {
  AlertCircle,
  AudioLines,
  CheckCircle2,
  Download,
  FileAudio,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { getHealth, getLanguages, Language, synthesize } from "@/lib/api";
import { loadStoredVoices, saveStoredVoices } from "@/lib/voiceLibrary";

const FALLBACK_LANGUAGES: Language[] = [
  { code: "en", name: "İngilizce", native_name: "English" },
  { code: "de", name: "Almanca", native_name: "Deutsch" },
  { code: "es", name: "İspanyolca", native_name: "Español" },
  { code: "it", name: "İtalyanca", native_name: "Italiano" },
  { code: "pt", name: "Portekizce", native_name: "Português" },
];

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_VOICES = 20;
const ACCEPTED = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];

type VoiceSample = {
  id: string;
  file: File;
  name: string;
  url: string;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback
    }
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function VoiceStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const voicesRef = useRef<VoiceSample[]>([]);
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [language, setLanguage] = useState("en");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<VoiceSample[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<"checking" | "ready" | "offline">("checking");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getHealth(controller.signal), getLanguages()])
      .then(([, items]) => {
        setLanguages(items);
        setServer("ready");
      })
      .catch(() => setServer("offline"));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    loadStoredVoices()
      .then((stored) => {
        const restored: VoiceSample[] = [];
        for (const item of stored.slice(0, MAX_VOICES)) {
          if (!item.file || !(item.file instanceof Blob)) continue;
          try {
            restored.push({
              ...item,
              url: URL.createObjectURL(item.file),
            });
          } catch {
            // Ignore invalid blob url
          }
        }
        setVoices(restored);
        setSelectedVoiceId(restored[0]?.id ?? null);
      })
      .catch(() => setError("Tarayıcıdaki ses arşivi açılamadı."))
      .finally(() => setLibraryLoaded(true));
  }, []);

  useEffect(() => {
    if (!libraryLoaded) return;
    saveStoredVoices(voices.map(({ id, name, file }) => ({ id, name, file })))
      .catch(() => setError("Ses arşivi tarayıcıya kaydedilemedi."));
  }, [libraryLoaded, voices]);

  useEffect(() => () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  useEffect(() => () => {
    voicesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const selectedVoice = useMemo(
    () => voices.find((item) => item.id === selectedVoiceId) ?? null,
    [selectedVoiceId, voices],
  );
  const canSubmit = Boolean(selectedVoice && text.trim().length >= 2 && consent && !working && server === "ready");
  const selectedLanguage = useMemo(
    () => languages.find((item) => item.code === language),
    [language, languages],
  );

  function addAudioFiles(files: File[]) {
    setError(null);
    setResultUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (!files || !files.length) return;

    if (voices.length >= MAX_VOICES) {
      setError(`En fazla ${MAX_VOICES} ses kaydı eklenebilir.`);
      return;
    }

    const availableSlots = MAX_VOICES - voices.length;
    const accepted: VoiceSample[] = [];
    let rejectedSize = 0;
    let rejectedFormat = 0;

    for (const file of files.slice(0, availableSlots)) {
      if (file.size > MAX_FILE_BYTES) {
        rejectedSize += 1;
        continue;
      }

      const mimeType = (file.type || "").toLowerCase();
      const fileName = (file.name || "").toLowerCase();

      const isAudioMime = mimeType.startsWith("audio/") || mimeType === "application/octet-stream" || mimeType === "";
      const isAudioExt = /\.(wav|mp3|m4a|aac|ogg|webm|flac|caf|m4r|3gp|mp4|wma)$/i.test(fileName) || !/\.[a-z0-9]+$/i.test(fileName);

      if (!isAudioMime && !isAudioExt) {
        rejectedFormat += 1;
        continue;
      }

      try {
        const url = URL.createObjectURL(file);
        const name = file.name ? file.name.replace(/\.[a-z0-9]+$/i, "") : "Ses kaydı";
        accepted.push({
          id: generateId(),
          file,
          name: name || "Ses kaydı",
          url,
        });
      } catch {
        rejectedFormat += 1;
      }
    }

    if (rejectedSize > 0) {
      setError("Yüklenen dosya 15 MB sınırını aşıyor.");
    } else if (rejectedFormat > 0) {
      setError("Yalnızca ses dosyaları kabul edilir (WAV, MP3, M4A vb.).");
    } else if (files.length > availableSlots) {
      setError(`En fazla ${MAX_VOICES} ses kaydı eklenebilir.`);
    }

    if (!accepted.length) return;
    setVoices((current) => [...current, ...accepted]);
    setSelectedVoiceId((current) => current ?? accepted[0].id);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      addAudioFiles(Array.from(event.target.files));
    }
    event.target.value = "";
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
    setDragging(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      addAudioFiles(Array.from(event.dataTransfer.files));
    }
  }

  function removeVoice(id: string) {
    setVoices((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      const next = current.filter((item) => item.id !== id);
      if (selectedVoiceId === id) {
        setSelectedVoiceId(next[0]?.id ?? null);
        setConsent(false);
      }
      return next;
    });
  }

  function selectVoice(id: string) {
    if (id === selectedVoiceId) return;
    setSelectedVoiceId(id);
    setConsent(false);
    setResultUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }

  function renameVoice(id: string, name: string) {
    setVoices((current) => current.map((item) => item.id === id ? { ...item, name } : item));
  }

  async function generate() {
    if (!selectedVoice || !canSubmit) return;
    setWorking(true);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    try {
      const blob = await synthesize(selectedVoice.file, text.trim(), language, speed, consent);
      setResultUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ses oluşturulamadı.");
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    setText("");
    setConsent(false);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
  }

  return (
    <main>
      <nav className="nav shell">
        <div className="brand"><span className="brand-mark"><AudioLines size={20} /></span> Voice AI</div>
        <div className={`status ${server}`}>
          <span /> {server === "ready" ? "GPU sunucusu hazır" : server === "checking" ? "Sunucu kontrol ediliyor" : "Sunucu çevrimdışı"}
        </div>
      </nav>

      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={15} /> Yerel ses, küresel ifade</div>
        <h1>Sesini başka bir dile<br /><em>doğal biçimde taşı.</em></h1>
        <p>Ses arşivini oluştur. İstediğin sesi seçip metnini beş dilde, o kişinin ses karakterine yakın bir tonda üret.</p>
      </section>

      <section className="studio shell">
        <div className="step-column">
          <header><span>01</span><div><h2>Ses arşivin</h2><p>En fazla 20 temiz, müziksiz ve 3–30 saniyelik kayıt ekle.</p></div></header>
          <div
            className={`dropzone voice-dropzone ${dragging ? "dragging" : ""}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" multiple accept="audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg,.webm" onChange={onFileChange} hidden />
            <div className="upload-icon"><UploadCloud /></div>
            <strong>Ses kayıtlarını buraya bırak</strong>
            <span>Birden fazla seçebilirsin · WAV, MP3, M4A · dosya başına maks. 15 MB</span>
          </div>
          {voices.length > 0 && (
            <div className="voice-library">
              <div className="voice-library-head"><span>{voices.length} / {MAX_VOICES} ses</span><button type="button" onClick={() => inputRef.current?.click()}><Plus size={14} /> Ses ekle</button></div>
              <div className="voice-list">
                {voices.map((item) => (
                  <div key={item.id} className={`voice-item ${item.id === selectedVoiceId ? "active" : ""}`} onClick={() => selectVoice(item.id)}>
                    <button type="button" className="voice-select" aria-label={`${item.name} sesini seç`}>
                      <FileAudio size={18} />
                    </button>
                    <div className="voice-details">
                      <input value={item.name} aria-label="Ses adı" maxLength={40} onClick={(event) => event.stopPropagation()} onChange={(event) => renameVoice(item.id, event.target.value)} />
                      <span>{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    {item.id === selectedVoiceId && <CheckCircle2 className="voice-active-icon" size={18} />}
                    <button type="button" className="voice-remove" aria-label={`${item.name} kaydını sil`} onClick={(event) => { event.stopPropagation(); removeVoice(item.id); }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              {selectedVoice && <audio className="audio-preview" controls src={selectedVoice.url} />}
              <p className="session-note"><LockKeyhole size={13} /> Arşiv bu cihazdaki tarayıcıda saklanır; sunucuya kaydedilmez.</p>
            </div>
          )}
        </div>

        <div className="step-column">
          <header><span>02</span><div><h2>Metin ve dil</h2><p>Seslendirmek istediğin metni ve hedef dili seç.</p></div></header>
          <label className="field-label" htmlFor="language">Hedef dil</label>
          <div className="language-grid">
            {languages.map((item) => (
              <button type="button" key={item.code} className={language === item.code ? "active" : ""} onClick={() => setLanguage(item.code)}>
                <span>{item.code.toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.native_name}</small></div>
              </button>
            ))}
          </div>
          <div className="textarea-wrap">
            <label className="field-label" htmlFor="text">Metin</label>
            <textarea id="text" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} placeholder={`${selectedLanguage?.native_name || "Seçilen dil"} dilinde metni buraya yaz…`} />
            <span className="counter">{text.length} / 2000</span>
          </div>
          <div className="speed-row">
            <label htmlFor="speed"><Gauge size={17} /> Konuşma hızı</label>
            <input id="speed" type="range" min="0.8" max="1.2" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} />
            <output>{speed.toFixed(2)}×</output>
          </div>
        </div>

        <div className="generate-panel">
          <label className="consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span className="checkmark" />
            <span>Seçili sesin sahibinden klonlama ve oluşturacağım içerik için açık izin aldığımı onaylıyorum.</span>
          </label>
          {error && <div className="error"><AlertCircle size={18} /> {error}</div>}
          {server === "offline" && <div className="error"><AlertCircle size={18} /> Colab arka ucu kapalı. Notebook hücresini yeniden çalıştır.</div>}
          <button className="generate" disabled={!canSubmit} onClick={generate}>
            {working ? <><LoaderCircle className="spin" /> Ses oluşturuluyor…</> : <><Sparkles /> Sesimi oluştur</>}
          </button>
          <p className="privacy"><LockKeyhole size={14} /> Dosyaların yalnızca geçici Colab oturumunda işlenir.</p>
        </div>

        {resultUrl && (
          <div className="result-card">
            <div className="result-heading"><span><CheckCircle2 /></span><div><small>HAZIR</small><h3>Ses kaydın oluşturuldu</h3></div></div>
            <audio controls autoPlay src={resultUrl} />
            <div className="result-actions">
              <a href={resultUrl} download={`voice-ai-${selectedVoice?.name || "voice"}-${language}.wav`}><Download size={17} /> WAV indir</a>
              <button type="button" onClick={reset}><RotateCcw size={17} /> Yeni kayıt</button>
            </div>
          </div>
        )}
      </section>

      <footer className="shell"><span>Voice AI · Açık kaynaklı kişisel prototip</span><span>Ses verilerin kalıcı olarak saklanmaz.</span></footer>
    </main>
  );
}
