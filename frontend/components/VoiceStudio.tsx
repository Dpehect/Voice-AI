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
  RotateCcw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { getHealth, getLanguages, Language, synthesize } from "@/lib/api";

const FALLBACK_LANGUAGES: Language[] = [
  { code: "en", name: "İngilizce", native_name: "English" },
  { code: "de", name: "Almanca", native_name: "Deutsch" },
  { code: "es", name: "İspanyolca", native_name: "Español" },
  { code: "it", name: "İtalyanca", native_name: "Italiano" },
  { code: "pt", name: "Portekizce", native_name: "Português" },
];

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];

export default function VoiceStudio() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [languages, setLanguages] = useState(FALLBACK_LANGUAGES);
  const [language, setLanguage] = useState("en");
  const [text, setText] = useState("");
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
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

  useEffect(() => () => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [voiceUrl, resultUrl]);

  const canSubmit = Boolean(voice && text.trim().length >= 2 && consent && !working && server === "ready");
  const selectedLanguage = useMemo(
    () => languages.find((item) => item.code === language),
    [language, languages],
  );

  function setAudioFile(file?: File) {
    setError(null);
    setResultUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    if (!file) return;
    const extensionOk = /\.(wav|mp3|m4a)$/i.test(file.name);
    if ((!ACCEPTED.includes(file.type) && !extensionOk) || file.size > MAX_FILE_BYTES) {
      setError("WAV, MP3 veya M4A biçiminde ve en fazla 15 MB bir kayıt yükle.");
      return;
    }
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoice(file);
    setVoiceUrl(URL.createObjectURL(file));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setAudioFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    setAudioFile(event.dataTransfer.files?.[0]);
  }

  async function generate() {
    if (!voice || !canSubmit) return;
    setWorking(true);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    try {
      const blob = await synthesize(voice, text.trim(), language, speed, consent);
      setResultUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ses oluşturulamadı.");
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    setVoice(null);
    setText("");
    setConsent(false);
    setError(null);
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setVoiceUrl(null);
    setResultUrl(null);
    if (inputRef.current) inputRef.current.value = "";
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
        <p>Tek bir ses örneği yükle. Metnini beş dilde, kendi ses karakterine yakın bir tonda oluştur.</p>
      </section>

      <section className="studio shell">
        <div className="step-column">
          <header><span>01</span><div><h2>Ses örneğin</h2><p>Temiz, müziksiz ve 6–30 saniyelik kayıt önerilir.</p></div></header>
          <div
            className={`dropzone ${dragging ? "dragging" : ""} ${voice ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".wav,.mp3,.m4a,audio/*" onChange={onFileChange} hidden />
            {voice ? (
              <>
                <div className="file-icon"><FileAudio /></div>
                <div className="file-meta"><strong>{voice.name}</strong><span>{(voice.size / 1024 / 1024).toFixed(1)} MB · değiştirmek için tıkla</span></div>
                <CheckCircle2 className="file-check" />
              </>
            ) : (
              <>
                <div className="upload-icon"><UploadCloud /></div>
                <strong>Ses kaydını buraya bırak</strong>
                <span>veya bilgisayarından seç · WAV, MP3, M4A · maks. 15 MB</span>
              </>
            )}
          </div>
          {voiceUrl && <audio className="audio-preview" controls src={voiceUrl} />}
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
            <span>Bu sesin bana ait olduğunu veya kullanmak için açık iznim bulunduğunu onaylıyorum.</span>
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
              <a href={resultUrl} download={`voice-ai-${language}.wav`}><Download size={17} /> WAV indir</a>
              <button type="button" onClick={reset}><RotateCcw size={17} /> Yeni kayıt</button>
            </div>
          </div>
        )}
      </section>

      <footer className="shell"><span>Voice AI · Açık kaynaklı kişisel prototip</span><span>Ses verilerin kalıcı olarak saklanmaz.</span></footer>
    </main>
  );
}

