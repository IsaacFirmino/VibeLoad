# VibeLoad API

API Node.js e TypeScript para baixar e converter, por link, mídias próprias, autorizadas ou em domínio público. Aceita arquivos diretos e links públicos compatíveis, sem contornar DRM ou autenticação.

## Desenvolvimento local

Requisitos:

- Node.js 22 ou superior
- FFmpeg disponível no PATH
- yt-dlp disponível no PATH para links de plataformas

Instale e execute:

```bash
npm install
npm run build
npm start
```

A API ficará disponível em `http://localhost:8787`.

## Rotas

- `GET /health`
- `POST /api/analyze`
- `POST /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs/:id/download`
- `DELETE /api/jobs/:id`

As solicitações de análise e conversão precisam enviar `consent: true`.

## Publicação no Render

O arquivo `render.yaml` na raiz configura um serviço Docker com FFmpeg. Conecte o repositório como um Blueprint no Render e confirme que o endereço final da API corresponde ao valor de `vibeload-api-url` em `index.html`.

O serviço aceita somente URLs HTTP ou HTTPS diretas de arquivos de áudio ou vídeo. URLs privadas, portas alternativas, credenciais embutidas, arquivos acima do limite e tipos incompatíveis são recusados.

Não use o serviço para contornar DRM, autenticação, restrições de plataforma ou direitos autorais.
