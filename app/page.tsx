import Image from "next/image";
import { ConverterWorkbench } from "./components/ConverterWorkbench";

const platforms = [
  { name: "YouTube", src: "https://cdn.simpleicons.org/youtube/6f7485" },
  { name: "Instagram", src: "https://cdn.simpleicons.org/instagram/6f7485" },
  { name: "TikTok", src: "https://cdn.simpleicons.org/tiktok/6f7485" },
  { name: "Facebook", src: "https://cdn.simpleicons.org/facebook/6f7485" },
];

function Brand() {
  return (
    <span className="brand-v2">
      <span className="brand-v2-mark">
        <Image src="/vibeload-logo.png" alt="" fill sizes="38px" />
      </span>
      <span>Vibe<strong>Load</strong></span>
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <nav className="nav-v2" aria-label="Navegação principal">
          <a href="#top" aria-label="VibeLoad - início"><Brand /></a>
          <div className="nav-v2-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#faq">Dúvidas</a>
          </div>
        </nav>
      </header>

      <section className="hero-v2" id="top">
        <div className="hero-v2-copy">
          <h1><span>Salve o que você quer.</span><span>Ouça quando quiser.</span></h1>
          <p>Cole o link, escolha vídeo ou áudio e baixe na qualidade certa para cada momento.</p>
          <div className="hero-v2-actions">
            <a className="button-primary" href="#converter">Baixar agora</a>
            <a className="button-secondary" href="#como-funciona">Como funciona</a>
          </div>
        </div>
        <figure className="hero-v2-media">
          <Image
            src="/hero-editorial.png"
            alt="Smartphone e fones de ouvido em uma composição de estúdio"
            width={1152}
            height={1536}
            priority
            sizes="(max-width: 767px) 100vw, 45vw"
          />
        </figure>
      </section>

      <section className="platform-rail reveal" aria-labelledby="platform-title">
        <h2 className="sr-only" id="platform-title">Plataformas preparadas para integração</h2>
        <p>Preparado para links de</p>
        <div className="platform-logos">
          {platforms.map((platform) => (
            // Raw SVG brand marks stay unoptimized because each asset is tiny and externally maintained.
            // eslint-disable-next-line @next/next/no-img-element
            <img key={platform.name} src={platform.src} alt={platform.name} width="34" height="34" loading="lazy" />
          ))}
        </div>
      </section>

      <section className="converter-section reveal" id="converter">
        <div className="section-copy-stack">
          <h2>Um campo. Todas as escolhas.</h2>
          <p>Analise o link, escolha o formato e prepare o arquivo sem sair da página.</p>
        </div>
        <ConverterWorkbench />
      </section>

      <section className="workflow-section reveal" id="como-funciona">
        <div className="section-copy-stack">
          <h2>Do link ao arquivo, sem desvio.</h2>
          <p>O processo foi reduzido ao que realmente importa.</p>
        </div>
        <div className="workflow-lane">
          <article>
            <span>Link</span>
            <div><h3>Cole</h3><p>Copie o endereço da mídia na plataforma de origem.</p></div>
          </article>
          <article>
            <span>Formato</span>
            <div><h3>Escolha</h3><p>Defina vídeo, áudio e a qualidade adequada.</p></div>
          </article>
          <article>
            <span>Arquivo</span>
            <div><h3>Baixe</h3><p>Confirme a opção e salve no seu dispositivo.</p></div>
          </article>
        </div>
      </section>

      <section className="formats-section reveal" id="formatos" aria-labelledby="formats-title">
        <div className="section-copy-stack">
          <h2 id="formats-title">Qualidade para cada contexto.</h2>
          <p>Escolha definição, compatibilidade ou tamanho de arquivo.</p>
        </div>
        <div className="format-track">
          <article className="format-poster format-poster-accent"><strong>4K</strong><span>MP4 para telas grandes</span></article>
          <article className="format-poster"><strong>1080p</strong><span>Equilíbrio para vídeo</span></article>
          <article className="format-poster format-poster-soft"><strong>320 kbps</strong><span>MP3 para ouvir com detalhe</span></article>
          <article className="format-poster"><strong>M4A</strong><span>Áudio leve e compatível</span></article>
        </div>
      </section>

      <section className="resources-section reveal" id="recursos">
        <div className="section-copy-stack">
          <h2>O essencial, bem resolvido.</h2>
          <p>Recursos claros para quem quer decidir rápido e seguir com o dia.</p>
        </div>
        <div className="resource-bento">
          <article className="resource-audio">
            <Image src="/audio-editorial.png" alt="Fones de ouvido em uma composição de estúdio" width={1536} height={1024} sizes="(max-width: 767px) 100vw, 58vw" />
            <div><h3>Áudio com presença</h3><p>Bitrates para ouvir no fone, no carro ou em caixas maiores.</p></div>
          </article>
          <article className="resource-quality"><strong>4K</strong><h3>Imagem preservada</h3><p>Resoluções para diferentes telas e conexões.</p></article>
          <article className="resource-private"><h3>Sem cadastro obrigatório</h3><p>O fluxo começa pelo link, não por um perfil.</p></article>
          <article className="resource-device"><strong>PC<br />iOS<br />Android</strong><p>Uma experiência adaptada para qualquer tela.</p></article>
          <article className="resource-direct"><h3>Direto no navegador</h3><p>Nada para instalar antes de começar.</p></article>
        </div>
      </section>

      <section className="offline-section reveal">
        <figure>
          <Image src="/offline-editorial.png" alt="Pessoa ouvindo mídia salva durante uma viagem de trem" width={1792} height={1024} sizes="100vw" />
        </figure>
        <div className="offline-caption">
          <h2>Seu ritmo continua offline.</h2>
          <p>Prepare vídeos e músicas para ouvir quando a conexão não acompanhar você.</p>
        </div>
      </section>

      <section className="faq-section reveal" id="faq">
        <div className="faq-title">
          <h2>Perguntas antes do primeiro link.</h2>
          <p>Respostas diretas sobre uso, formatos e funcionamento.</p>
        </div>
        <div className="faq-grid">
          <details open>
            <summary>Preciso instalar algum programa?</summary>
            <p>Não. A experiência foi desenhada para funcionar direto no navegador.</p>
          </details>
          <details>
            <summary>Quais formatos estarão disponíveis?</summary>
            <p>O fluxo prevê MP4 para vídeo e MP3 ou M4A para áudio.</p>
          </details>
          <details>
            <summary>Funciona no celular?</summary>
            <p>Sim. A página se adapta a computadores, tablets e celulares.</p>
          </details>
          <details>
            <summary>Posso baixar qualquer conteúdo?</summary>
            <p>Use apenas mídia própria, autorizada ou em domínio público.</p>
          </details>
        </div>
      </section>

      <section className="final-cta reveal">
        <h2>Um link é o bastante.</h2>
        <p>Escolha o formato certo para o momento certo.</p>
        <a className="button-primary" href="#formatos">Ver formatos</a>
      </section>

      <footer className="footer-v2">
        <div className="footer-v2-brand">
          <Brand />
          <p>Sua mídia, no seu ritmo.</p>
        </div>
        <div className="footer-v2-links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#faq">Dúvidas</a>
        </div>
        <p className="footer-v2-legal">Baixe somente conteúdo próprio, autorizado ou em domínio público.</p>
      </footer>
    </main>
  );
}
