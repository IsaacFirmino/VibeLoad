"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RainbowButton } from "@/components/ui/rainbow-button";

type MediaType = "video" | "audio";
type AnalysisStatus = "idle" | "loading" | "ready" | "error";

const formats = {
  video: [
    { quality: "4K", format: "MP4" },
    { quality: "1080p", format: "MP4" },
    { quality: "720p", format: "MP4" },
    { quality: "480p", format: "WEBM" },
  ],
  audio: [
    { quality: "320 kbps", format: "MP3" },
    { quality: "256 kbps", format: "MP3" },
    { quality: "192 kbps", format: "MP3" },
    { quality: "128 kbps", format: "M4A" },
  ],
};

export function ConverterWorkbench() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selected, setSelected] = useState("1080p");
  const [notice, setNotice] = useState("");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      setStatus("error");
      return;
    }

    setStatus("loading");
    timer.current = window.setTimeout(() => setStatus("ready"), 850);
  }

  function changeType(type: MediaType) {
    setMediaType(type);
    setSelected(type === "video" ? "1080p" : "320 kbps");
    setNotice("");
  }

  function prepareDownload() {
    setNotice(`Formato ${selected} selecionado. A conversão real será ativada quando o provedor de mídia for conectado.`);
  }

  const source = (() => {
    try { return new URL(url).hostname.replace("www.", ""); }
    catch { return "link de mídia"; }
  })();

  return (
    <div className="workbench" aria-live="polite">
      <form className="workbench-form" onSubmit={analyze} noValidate>
        <label htmlFor="media-link">Link do vídeo ou áudio</label>
        <div className="workbench-form-row">
          <input
            id="media-link"
            name="media-link"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="https://"
            aria-describedby="media-link-help media-link-error"
            aria-invalid={status === "error"}
          />
          <RainbowButton className="h-14 px-[18px]" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Analisando" : "Analisar link"}
          </RainbowButton>
        </div>
        <p id="media-link-help" className="workbench-help">Use conteúdo próprio, autorizado ou em domínio público.</p>
        {status === "error" && <p id="media-link-error" className="workbench-error" role="alert">Insira um endereço válido começando com http:// ou https://</p>}
      </form>

      <div className="workbench-result">
        {status === "idle" || status === "error" ? (
          <div className="result-empty">
            <strong>Seu arquivo começa com um link.</strong>
            <p>Depois da análise, as opções de formato e qualidade aparecem aqui.</p>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="result-loading" aria-label="Analisando mídia">
            <span className="skeleton-line skeleton-wide" />
            <span className="skeleton-line skeleton-short" />
            <div className="skeleton-options"><span /><span /><span /></div>
          </div>
        ) : null}

        {status === "ready" ? (
          <div className="result-ready">
            <div className="result-heading">
              <div>
                <span>Fonte</span>
                <strong>{source}</strong>
              </div>
              <div className="media-switch" aria-label="Tipo de arquivo">
                <button type="button" aria-pressed={mediaType === "video"} onClick={() => changeType("video")}>Vídeo</button>
                <button type="button" aria-pressed={mediaType === "audio"} onClick={() => changeType("audio")}>Áudio</button>
              </div>
            </div>

            <div className="quality-options" aria-label="Qualidade">
              {formats[mediaType].map((option) => (
                <button
                  type="button"
                  key={option.quality}
                  className={selected === option.quality ? "selected" : ""}
                  aria-pressed={selected === option.quality}
                  onClick={() => { setSelected(option.quality); setNotice(""); }}
                >
                  <strong>{option.quality}</strong>
                  <span>{option.format}</span>
                </button>
              ))}
            </div>

            <RainbowButton className="download-action h-14 px-[18px]" type="button" onClick={prepareDownload}>Baixar agora</RainbowButton>
            {notice && <p className="download-notice" role="status">{notice}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
