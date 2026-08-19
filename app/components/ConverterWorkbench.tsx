"use client";

import { FormEvent, useState } from "react";
import { RainbowButton } from "@/components/ui/rainbow-button";

type MediaType = "video" | "audio";
type SourceMode = "link" | "upload";
type AnalysisStatus = "idle" | "loading" | "ready" | "error";

type ConversionJob = {
  id: string;
  status: "queued" | "downloading" | "converting" | "ready" | "failed";
  error: string | null;
  downloadUrl: string | null;
};

const apiBaseUrl = "https://vibeload-api-isaacfirmino.onrender.com";
const maxUploadBytes = 100 * 1024 * 1024;

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

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "O serviço não conseguiu concluir a solicitação.");
  }
  return payload;
}

async function waitForJob(jobId: string, onStatus: (message: string) => void) {
  const deadline = Date.now() + 10 * 60 * 1000;
  const labels: Record<string, string> = {
    queued: "Aguardando processamento",
    downloading: "Baixando arquivo autorizado",
    converting: "Convertendo arquivo",
  };

  while (Date.now() < deadline) {
    const payload = await apiRequest<{ job: ConversionJob }>(`/api/jobs/${jobId}`);
    if (payload.job.status === "ready") return payload.job;
    if (payload.job.status === "failed") throw new Error(payload.job.error ?? "A conversão falhou.");
    onStatus(`${labels[payload.job.status] ?? "Processando"}...`);
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
  }
  throw new Error("A conversão demorou mais que o limite permitido.");
}

export function ConverterWorkbench() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("link");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [selected, setSelected] = useState("1080p");
  const [source, setSource] = useState("link de mídia");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function changeSourceMode(mode: SourceMode) {
    setSourceMode(mode);
    setStatus("idle");
    setNotice("");
  }

  function changeType(type: MediaType) {
    setMediaType(type);
    setSelected(type === "video" ? "1080p" : "320 kbps");
    setNotice("");
  }

  async function prepareSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!rightsConfirmed) {
      setStatus("error");
      setNotice("Confirme que possui autorização para processar este conteúdo.");
      return;
    }

    if (sourceMode === "upload") {
      if (!file) {
        setStatus("error");
        setNotice("Selecione um arquivo de áudio ou vídeo.");
        return;
      }
      if (file.size > maxUploadBytes) {
        setStatus("error");
        setNotice("O arquivo excede o limite de 100 MB.");
        return;
      }
      setSource(file.name);
      changeType(file.type.startsWith("audio/") ? "audio" : "video");
      setStatus("ready");
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      setStatus("error");
      setNotice("Insira um endereço válido começando com http:// ou https://");
      return;
    }

    setStatus("loading");
    try {
      const analysis = await apiRequest<{ source: string }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: parsed.toString(), consent: true }),
      });
      setSource(analysis.source);
      changeType("video");
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "Não foi possível analisar este endereço.");
    }
  }

  async function prepareDownload() {
    if (!rightsConfirmed || (sourceMode === "upload" ? !file : !url)) {
      setNotice("Selecione novamente a origem e confirme que possui autorização.");
      return;
    }

    setBusy(true);
    setNotice(sourceMode === "upload" ? "Enviando arquivo com segurança..." : "Criando conversão...");
    try {
      let created: { job: ConversionJob };
      if (sourceMode === "upload" && file) {
        const formData = new FormData();
        formData.append("file", file, file.name);
        const query = new URLSearchParams({ mediaType, quality: selected, consent: "true" });
        created = await apiRequest<{ job: ConversionJob }>(`/api/uploads?${query}`, { method: "POST", body: formData });
      } else {
        created = await apiRequest<{ job: ConversionJob }>("/api/jobs", {
          method: "POST",
          body: JSON.stringify({ url, mediaType, quality: selected, consent: true }),
        });
      }

      const job = await waitForJob(created.job.id, setNotice);
      const downloadLink = document.createElement("a");
      downloadLink.href = `${apiBaseUrl}${job.downloadUrl}`;
      document.body.append(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      setNotice("Download iniciado. O arquivo ficará disponível por tempo limitado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível preparar o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workbench" aria-live="polite">
      <form className="workbench-form" onSubmit={prepareSource} noValidate>
        <div className="source-switch" aria-label="Origem da mídia">
          <button type="button" aria-pressed={sourceMode === "link"} onClick={() => changeSourceMode("link")}>Colar link</button>
          <button type="button" aria-pressed={sourceMode === "upload"} onClick={() => changeSourceMode("upload")}>Enviar arquivo</button>
        </div>

        {sourceMode === "link" ? (
          <>
            <label htmlFor="media-link">Link do vídeo ou áudio</label>
            <div className="workbench-form-row">
              <input id="media-link" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" aria-invalid={status === "error"} />
              <RainbowButton className="h-14 px-[18px]" type="submit" disabled={status === "loading"}>{status === "loading" ? "Analisando" : "Analisar link"}</RainbowButton>
            </div>
            <p className="workbench-help">Use conteúdo próprio, autorizado ou em domínio público.</p>
          </>
        ) : (
          <>
            <div className="upload-field">
              <input id="media-file" type="file" accept="audio/*,video/*,.m4a,.mkv,.mov,.mp3,.mp4,.ogg,.wav,.webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              <label className="upload-field-copy" htmlFor="media-file"><strong>Escolher áudio ou vídeo</strong><small>Arquivos de até 100 MB</small></label>
            </div>
            <p className="selected-file">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Nenhum arquivo selecionado."}</p>
            <RainbowButton className="upload-prepare h-14 px-[18px]" type="submit">Usar este arquivo</RainbowButton>
          </>
        )}

        <label className="rights-confirmation" htmlFor="rights-confirmation-react">
          <input id="rights-confirmation-react" type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
          <span>Confirmo que tenho autorização para processar este conteúdo.</span>
        </label>
        {status === "error" && <p className="workbench-error" role="alert">{notice}</p>}
      </form>

      <div className="workbench-result">
        {status === "idle" || status === "error" ? (
          <div className="result-empty">
            <strong>{sourceMode === "upload" ? "Escolha um arquivo do dispositivo." : "Seu arquivo começa com um link."}</strong>
            <p>{sourceMode === "upload" ? "Depois, defina o formato e deixe a conversão com o VibeLoad." : "Depois da análise, as opções aparecem aqui."}</p>
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="result-loading" aria-label="Analisando mídia"><span className="skeleton-line skeleton-wide" /><span className="skeleton-line skeleton-short" /><div className="skeleton-options"><span /><span /><span /></div></div>
        ) : null}
        {status === "ready" ? (
          <div className="result-ready">
            <div className="result-heading">
              <div><span>Fonte</span><strong>{source}</strong></div>
              <div className="media-switch" aria-label="Tipo de arquivo">
                <button type="button" aria-pressed={mediaType === "video"} onClick={() => changeType("video")}>Vídeo</button>
                <button type="button" aria-pressed={mediaType === "audio"} onClick={() => changeType("audio")}>Áudio</button>
              </div>
            </div>
            <div className="quality-options" aria-label="Qualidade">
              {formats[mediaType].map((option) => (
                <button type="button" key={option.quality} className={selected === option.quality ? "selected" : ""} aria-pressed={selected === option.quality} onClick={() => setSelected(option.quality)}>
                  <strong>{option.quality}</strong><span>{option.format}</span>
                </button>
              ))}
            </div>
            <RainbowButton className="download-action h-14 px-[18px]" type="button" disabled={busy} onClick={prepareDownload}>{busy ? "Processando" : sourceMode === "upload" ? "Converter e baixar" : "Baixar agora"}</RainbowButton>
            {notice && <p className="download-notice" role="status">{notice}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
