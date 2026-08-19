"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type DownloadType = "video" | "audio";
type Status = "idle" | "analyzing" | "ready" | "error";

const formatOptions = {
  video: [
    { quality: "4K", format: "MP4", size: "~284 MB", badge: "Máxima" },
    { quality: "1080p", format: "MP4", size: "~96 MB", badge: "Popular" },
    { quality: "720p", format: "MP4", size: "~52 MB", badge: "" },
    { quality: "480p", format: "MP4", size: "~28 MB", badge: "Leve" },
  ],
  audio: [
    { quality: "320 kbps", format: "MP3", size: "~12 MB", badge: "Máxima" },
    { quality: "256 kbps", format: "MP3", size: "~9 MB", badge: "Popular" },
    { quality: "192 kbps", format: "MP3", size: "~7 MB", badge: "" },
    { quality: "128 kbps", format: "M4A", size: "~5 MB", badge: "Leve" },
  ],
};

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark" aria-hidden="true"><span className="brand-play" /></span>
      <span>Vibe<span>Load</span></span>
    </span>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [downloadType, setDownloadType] = useState<DownloadType>("video");
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  const [notice, setNotice] = useState("");

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    } catch {
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    window.setTimeout(() => {
      setStatus("ready");
      document.querySelector("#resultado")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 1000);
  }

  function handleDownload(quality: string) {
    setSelectedQuality(quality);
    setNotice(`Opção ${quality} selecionada. A integração de processamento será conectada na próxima etapa.`);
    window.setTimeout(() => setNotice(""), 4200);
  }

  const sourceName = (() => {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return "Link de mídia"; }
  })();

  return (
    <main className="site-shell">
      <header className="navbar-wrap">
        <nav className="navbar" aria-label="Navegação principal">
          <a href="#top" aria-label="VibeLoad — início"><Brand /></a>
          <div className="nav-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#faq">Dúvidas</a>
          </div>
          <a className="nav-action" href="#converter">Baixar agora</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="floating-format floating-format-video" aria-hidden="true"><b>4K</b><span>vídeo nítido</span></div>
        <div className="floating-format floating-format-audio" aria-hidden="true"><b>320</b><span>kbps áudio</span></div>

        <div className="hero-logo-card" aria-hidden="true">
          <Image src="/vibeload-logo.png" alt="" width={1254} height={1254} priority />
        </div>

        <div className="eyebrow"><span /> Downloads simples, do seu jeito</div>
        <h1>Seu conteúdo favorito.<br /><em>Na qualidade que quiser.</em></h1>
        <p className="hero-copy">
          Cole o link, escolha o formato e salve áudio ou vídeo em poucos instantes.
          Sem complicação, direto no navegador.
        </p>

        <form className={`converter ${status === "error" ? "converter-error" : ""}`} id="converter" onSubmit={handleAnalyze}>
          <div className="input-wrap">
            <span className="link-icon" aria-hidden="true">↗</span>
            <input
              aria-label="Link do vídeo ou áudio"
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => { setUrl(event.target.value); if (status === "error") setStatus("idle"); }}
              placeholder="Cole o link do vídeo ou áudio aqui..."
            />
          </div>
          <button type="submit" disabled={status === "analyzing"}>
            {status === "analyzing" ? <><span className="spinner" /> Analisando</> : <>Analisar link <span aria-hidden="true">→</span></>}
          </button>
        </form>
        {status === "error" && <p className="form-error" role="alert">Insira um link válido começando com http:// ou https://</p>}

        <div className="platforms" aria-label="Plataformas compatíveis">
          <span>Compatível com</span>
          <span className="platform-chip platform-youtube"><i>▶</i> YouTube</span>
          <span className="platform-chip"><i>◎</i> Instagram</span>
          <span className="platform-chip"><i>♪</i> TikTok</span>
          <span className="platform-chip"><i>f</i> Facebook</span>
        </div>
      </section>

      {status === "ready" && (
        <section className="result-section" id="resultado" aria-live="polite">
          <div className="result-card">
            <div className="result-preview">
              <div className="preview-art"><span className="preview-play">▶</span></div>
              <div>
                <span className="source-label">{sourceName}</span>
                <h2>Mídia pronta para converter</h2>
                <p>Prévia do fluxo • selecione o formato e a qualidade</p>
              </div>
            </div>
            <div className="format-switch" aria-label="Tipo de arquivo">
              <button className={downloadType === "video" ? "active" : ""} onClick={() => { setDownloadType("video"); setSelectedQuality("1080p"); }} type="button">▣ Vídeo</button>
              <button className={downloadType === "audio" ? "active" : ""} onClick={() => { setDownloadType("audio"); setSelectedQuality("256 kbps"); }} type="button">♫ Áudio</button>
            </div>
            <div className="quality-list">
              {formatOptions[downloadType].map((option) => (
                <div className={`quality-row ${selectedQuality === option.quality ? "selected" : ""}`} key={option.quality}>
                  <div className="quality-radio" aria-hidden="true"><span /></div>
                  <div className="quality-name"><b>{option.quality}</b><span>{option.format}</span></div>
                  {option.badge && <span className="quality-badge">{option.badge}</span>}
                  <span className="quality-size">{option.size}</span>
                  <button type="button" onClick={() => handleDownload(option.quality)}>Baixar <span>↓</span></button>
                </div>
              ))}
            </div>
            <p className="prototype-note">Esta é a experiência completa do produto. Downloads reais exigem a conexão de um provedor de processamento de mídia.</p>
          </div>
        </section>
      )}

      <section className="steps section" id="como-funciona">
        <div className="section-heading">
          <span className="section-kicker">Como funciona</span>
          <h2>Do link ao download<br />em três movimentos.</h2>
          <p>Sem menus confusos. O VibeLoad mantém tudo o que importa em uma única jornada.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card step-featured">
            <span className="step-number">01</span>
            <div className="step-icon">↗</div>
            <h3>Cole o link</h3>
            <p>Copie o endereço da mídia na plataforma de origem e cole no campo acima.</p>
            <div className="mini-url"><span>↗</span><i>https://seu-link.com/video</i><b>✓</b></div>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <div className="step-icon">◇</div>
            <h3>Escolha o formato</h3>
            <p>Prefere assistir ou ouvir? Selecione MP4, MP3 e a qualidade ideal.</p>
            <div className="mini-formats"><span className="active">MP4</span><span>MP3</span><span>M4A</span></div>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <div className="step-icon">↓</div>
            <h3>Baixe e aproveite</h3>
            <p>Confirme sua escolha e receba o arquivo direto no seu dispositivo.</p>
            <div className="mini-progress"><span><i /></span><b>Pronto!</b></div>
          </article>
        </div>
      </section>

      <section className="features section" id="recursos">
        <div className="section-heading section-heading-center">
          <span className="section-kicker">Feito para ser fácil</span>
          <h2>Tudo que você precisa.<br /><em>Nada que atrapalhe.</em></h2>
        </div>
        <div className="bento-grid">
          <article className="bento-card bento-quality">
            <div className="bento-copy"><span className="bento-icon">✦</span><h3>Qualidade de verdade</h3><p>Do arquivo compacto à resolução que preenche a tela.</p></div>
            <div className="quality-display"><span>até</span><b>4K</b><i>Ultra HD</i></div>
          </article>
          <article className="bento-card bento-speed">
            <span className="bento-icon">⚡</span><h3>Rápido por natureza</h3><p>Uma jornada direta, com menos espera entre o link e o arquivo.</p>
            <div className="speed-lines"><i /><i /><i /><i /><i /></div>
          </article>
          <article className="bento-card bento-private">
            <span className="bento-icon">◇</span><h3>Privacidade primeiro</h3><p>Sem cadastro obrigatório. Seu link não vira um perfil.</p>
            <div className="privacy-pill"><span>●</span> Sessão privada</div>
          </article>
          <article className="bento-card bento-formats">
            <div className="format-stack" aria-hidden="true"><span>MP4</span><span>MP3</span><span>M4A</span></div>
            <div className="bento-copy"><span className="bento-icon">▦</span><h3>O formato é seu</h3><p>Vídeo e áudio com opções para cada momento e dispositivo.</p></div>
          </article>
        </div>
      </section>

      <section className="promise section">
        <div className="promise-logo" aria-hidden="true"><Image src="/vibeload-logo.png" alt="" width={1254} height={1254} /></div>
        <div className="promise-copy">
          <span className="section-kicker section-kicker-light">Uma experiência sem ruído</span>
          <h2>Um link.<br />Todas as possibilidades.</h2>
          <p>Use o VibeLoad em qualquer tela e mantenha suas mídias disponíveis para quando estiver offline.</p>
          <a href="#converter">Experimentar agora <span>→</span></a>
        </div>
        <div className="promise-stats">
          <div><b>4K</b><span>vídeo</span></div>
          <div><b>320</b><span>kbps</span></div>
          <div><b>0</b><span>cadastros</span></div>
        </div>
      </section>

      <section className="faq section" id="faq">
        <div className="faq-intro">
          <span className="section-kicker">Perguntas frequentes</span>
          <h2>Ficou com<br />alguma dúvida?</h2>
          <p>A resposta provavelmente está aqui. Se não estiver, a gente simplifica.</p>
          <a href="mailto:contato@vibeload.app">Falar com o VibeLoad →</a>
        </div>
        <div className="faq-list">
          <details open><summary>Preciso instalar algum programa?<span>+</span></summary><p>Não. O VibeLoad foi desenhado para funcionar direto no navegador, em computador, tablet ou celular.</p></details>
          <details><summary>Quais formatos estarão disponíveis?<span>+</span></summary><p>A experiência prevê MP4 para vídeo e MP3 ou M4A para áudio, com várias opções de resolução e bitrate.</p></details>
          <details><summary>Existe limite de downloads?<span>+</span></summary><p>O modelo inicial não exige cadastro. Limites finais dependem da infraestrutura de processamento escolhida para a versão em produção.</p></details>
          <details><summary>Posso baixar qualquer conteúdo?<span>+</span></summary><p>Use apenas mídias próprias, em domínio público ou para as quais você tenha autorização do titular dos direitos.</p></details>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand"><Brand light /><p>Sua mídia, no seu ritmo.<br />Simples assim.</p></div>
          <div className="footer-links"><b>Produto</b><a href="#converter">Converter</a><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a></div>
          <div className="footer-links"><b>Suporte</b><a href="#faq">Dúvidas</a><a href="mailto:contato@vibeload.app">Contato</a><a href="#direitos">Uso responsável</a></div>
          <a className="footer-cta" href="#converter"><span>Pronto para começar?</span><b>Cole seu primeiro link →</b></a>
        </div>
        <div className="footer-bottom" id="direitos">
          <span>© 2026 VibeLoad. Todos os direitos reservados.</span>
          <span>Baixe somente conteúdo próprio, autorizado ou em domínio público.</span>
        </div>
      </footer>

      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}
