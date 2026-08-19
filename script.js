document.documentElement.classList.add("js");

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

const state = {
  sourceMode: "link",
  mediaType: "video",
  selected: "1080p",
  sourceUrl: "",
  sourceFile: null,
};

const maxUploadBytes = 100 * 1024 * 1024;
const allowedUploadExtensions = new Set([
  "aac", "flac", "m4a", "mkv", "mov", "mp3", "mp4", "mpeg", "ogg", "opus", "wav", "webm",
]);

const apiMeta = document.querySelector('meta[name="vibeload-api-url"]');
const apiBaseUrl = (apiMeta?.content ?? "").trim().replace(/\/$/, "");
const form = document.querySelector("#converter-form");
const input = document.querySelector("#media-link");
const fileInput = document.querySelector("#media-file");
const linkSourcePanel = document.querySelector("#link-source-panel");
const uploadSourcePanel = document.querySelector("#upload-source-panel");
const sourceModeButtons = document.querySelectorAll("[data-source-mode]");
const selectedFile = document.querySelector("#selected-file");
const rightsConfirmation = document.querySelector("#rights-confirmation");
const errorMessage = document.querySelector("#media-link-error");
const analyzeButton = document.querySelector("#analyze-button");
const analyzeLabel = analyzeButton.querySelector("span");
const emptyResult = document.querySelector("#result-empty");
const loadingResult = document.querySelector("#result-loading");
const readyResult = document.querySelector("#result-ready");
const emptyResultTitle = document.querySelector("#empty-result-title");
const emptyResultCopy = document.querySelector("#empty-result-copy");
const sourceLabel = document.querySelector("#result-source");
const qualityOptions = document.querySelector("#quality-options");
const downloadButton = document.querySelector("#download-button");
const downloadLabel = downloadButton.querySelector("span");
const downloadNotice = document.querySelector("#download-notice");
const mediaButtons = document.querySelectorAll("[data-media-type]");

function setResultStage(stage) {
  emptyResult.hidden = stage !== "empty";
  loadingResult.hidden = stage !== "loading";
  readyResult.hidden = stage !== "ready";
}

function clearError() {
  input.removeAttribute("aria-invalid");
  fileInput.removeAttribute("aria-invalid");
  errorMessage.hidden = true;
}

function showError(message) {
  const field = state.sourceMode === "upload" ? fileInput : input;
  field.setAttribute("aria-invalid", "true");
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function parseMediaUrl(value) {
  try {
    const parsed = new URL(value);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function apiRequest(path, options = {}) {
  if (!apiBaseUrl) {
    throw new Error("O endereço da API ainda não foi configurado.");
  }

  let response;
  try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("O serviço de conversão está indisponível no momento.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "O serviço não conseguiu concluir a solicitação.");
  }

  return payload;
}

function getUploadExtension(filename) {
  return filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
}

function isAllowedUpload(file) {
  return /^(audio|video)\//i.test(file.type)
    || allowedUploadExtensions.has(getUploadExtension(file.name));
}

function resetSource() {
  state.sourceUrl = "";
  state.sourceFile = null;
  setResultStage("empty");
  downloadNotice.hidden = true;
}

function setSourceMode(mode) {
  if (mode !== "link" && mode !== "upload") return;

  state.sourceMode = mode;
  clearError();
  resetSource();
  linkSourcePanel.hidden = mode !== "link";
  uploadSourcePanel.hidden = mode !== "upload";

  sourceModeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.sourceMode === mode));
  });

  if (mode === "upload") {
    emptyResultTitle.textContent = "Escolha um arquivo do dispositivo.";
    emptyResultCopy.textContent = "Depois, defina o formato e deixe a conversão com o VibeLoad.";
    downloadLabel.textContent = "Converter e baixar";
  } else {
    emptyResultTitle.textContent = "Seu arquivo começa com um link.";
    emptyResultCopy.textContent = "Depois da análise, as opções de formato e qualidade aparecem aqui.";
    downloadLabel.textContent = "Baixar agora";
  }
}

function selectQuality(quality) {
  state.selected = quality;
  downloadNotice.hidden = true;

  qualityOptions.querySelectorAll("button").forEach((button) => {
    const isSelected = button.dataset.quality === quality;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function renderQualityOptions() {
  qualityOptions.replaceChildren();

  formats[state.mediaType].forEach((option) => {
    const button = document.createElement("button");
    const quality = document.createElement("strong");
    const format = document.createElement("span");

    button.type = "button";
    button.dataset.quality = option.quality;
    button.setAttribute("aria-pressed", String(option.quality === state.selected));
    button.classList.toggle("selected", option.quality === state.selected);
    quality.textContent = option.quality;
    format.textContent = option.format;

    button.append(quality, format);
    button.addEventListener("click", () => selectQuality(option.quality));
    qualityOptions.append(button);
  });
}

function selectMediaType(type) {
  if (type !== "video" && type !== "audio") return;

  state.mediaType = type;
  state.selected = type === "video" ? "1080p" : "320 kbps";
  downloadNotice.hidden = true;

  mediaButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mediaType === type));
  });

  renderQualityOptions();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  downloadNotice.hidden = true;

  if (!rightsConfirmation.checked) {
    showError("Confirme que você possui autorização para processar este conteúdo.");
    rightsConfirmation.focus();
    return;
  }

  if (state.sourceMode === "upload") {
    const file = fileInput.files?.[0];
    if (!file) {
      showError("Selecione um arquivo de áudio ou vídeo.");
      fileInput.focus();
      return;
    }
    if (!isAllowedUpload(file)) {
      showError("Escolha um arquivo de áudio ou vídeo compatível.");
      fileInput.focus();
      return;
    }
    if (file.size > maxUploadBytes) {
      showError("O arquivo excede o limite de 100 MB.");
      fileInput.focus();
      return;
    }

    state.sourceFile = file;
    state.sourceUrl = "";
    sourceLabel.textContent = file.name;
    selectMediaType(file.type.startsWith("audio/") ? "audio" : "video");
    setResultStage("ready");
    return;
  }

  const parsedUrl = parseMediaUrl(input.value.trim());
  if (!parsedUrl) {
    showError("Insira um endereço válido começando com http:// ou https://");
    input.focus();
    return;
  }

  analyzeButton.disabled = true;
  analyzeLabel.textContent = "Analisando";
  setResultStage("loading");

  try {
    const analysis = await apiRequest("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ url: parsedUrl.toString(), consent: true }),
    });

    state.sourceUrl = parsedUrl.toString();
    sourceLabel.textContent = analysis.source;
    selectMediaType("video");
    setResultStage("ready");
  } catch (error) {
    setResultStage("empty");
    showError(error instanceof Error ? error.message : "Não foi possível analisar este endereço.");
  } finally {
    analyzeButton.disabled = false;
    analyzeLabel.textContent = "Analisar link";
  }
});

input.addEventListener("input", clearError);
fileInput.addEventListener("change", () => {
  clearError();
  resetSource();
  const file = fileInput.files?.[0];
  if (!file) {
    selectedFile.textContent = "Nenhum arquivo selecionado.";
    return;
  }

  selectedFile.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
});
rightsConfirmation.addEventListener("change", clearError);

sourceModeButtons.forEach((button) => {
  button.addEventListener("click", () => setSourceMode(button.dataset.sourceMode));
});

mediaButtons.forEach((button) => {
  button.addEventListener("click", () => selectMediaType(button.dataset.mediaType));
});

async function waitForJob(jobId) {
  const deadline = Date.now() + 10 * 60 * 1000;
  const labels = {
    queued: "Aguardando processamento",
    downloading: "Baixando arquivo autorizado",
    converting: "Convertendo arquivo",
  };

  while (Date.now() < deadline) {
    const payload = await apiRequest(`/api/jobs/${jobId}`);
    const job = payload.job;

    if (job.status === "ready") return job;
    if (job.status === "failed") throw new Error(job.error ?? "A conversão falhou.");

    downloadNotice.textContent = `${labels[job.status] ?? "Processando"}...`;
    downloadNotice.hidden = false;
    await delay(2500);
  }

  throw new Error("A conversão demorou mais que o limite permitido.");
}

downloadButton.addEventListener("click", async () => {
  const hasSource = state.sourceMode === "upload" ? state.sourceFile : state.sourceUrl;
  if (!hasSource || !rightsConfirmation.checked) {
    showError(state.sourceMode === "upload"
      ? "Selecione novamente o arquivo e confirme que possui autorização."
      : "Analise novamente o link e confirme que possui autorização.");
    return;
  }

  downloadButton.disabled = true;
  downloadLabel.textContent = state.sourceMode === "upload" ? "Enviando" : "Preparando";
  downloadNotice.textContent = state.sourceMode === "upload" ? "Enviando arquivo com segurança..." : "Criando conversão...";
  downloadNotice.hidden = false;

  try {
    let created;
    if (state.sourceMode === "upload") {
      const formData = new FormData();
      formData.append("file", state.sourceFile, state.sourceFile.name);
      const query = new URLSearchParams({
        mediaType: state.mediaType,
        quality: state.selected,
        consent: "true",
      });
      created = await apiRequest(`/api/uploads?${query}`, {
        method: "POST",
        body: formData,
      });
    } else {
      created = await apiRequest("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          url: state.sourceUrl,
          mediaType: state.mediaType,
          quality: state.selected,
          consent: true,
        }),
      });
    }
    const job = await waitForJob(created.job.id);
    const downloadLink = document.createElement("a");

    downloadLink.href = `${apiBaseUrl}${job.downloadUrl}`;
    downloadLink.hidden = true;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    downloadNotice.textContent = "Download iniciado. O arquivo ficará disponível por tempo limitado.";
  } catch (error) {
    downloadNotice.textContent = error instanceof Error ? error.message : "Não foi possível preparar o arquivo.";
  } finally {
    downloadButton.disabled = false;
    downloadLabel.textContent = state.sourceMode === "upload" ? "Converter e baixar" : "Baixar agora";
  }
});

document.querySelectorAll(".faq-grid details").forEach((item) => {
  item.addEventListener("toggle", () => {
    if (!item.open) return;
    document.querySelectorAll(".faq-grid details").forEach((otherItem) => {
      if (otherItem !== item) otherItem.open = false;
    });
  });
});

const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.08 },
  );

  revealItems.forEach((item) => observer.observe(item));
}

renderQualityOptions();
