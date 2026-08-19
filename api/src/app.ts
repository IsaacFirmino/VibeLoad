import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";

import { config } from "./config.js";
import { convertMedia } from "./converter.js";
import { ApiError } from "./errors.js";
import { conversionProfiles, getProfile, type MediaType } from "./profiles.js";
import { downloadRemoteMedia, inspectRemoteMedia } from "./remote.js";
import { parseRemoteUrl } from "./security.js";

type JobStatus = "queued" | "downloading" | "converting" | "ready" | "failed";

type ConversionJob = {
  id: string;
  url?: string;
  sourcePath?: string;
  sourceName?: string;
  mediaType: MediaType;
  quality: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  outputPath?: string;
  extension?: string;
  mimeType?: string;
  size?: number;
  error?: string;
};

type CreateJobBody = {
  url?: unknown;
  mediaType?: unknown;
  quality?: unknown;
  consent?: unknown;
};

type AnalyzeBody = {
  url?: unknown;
  consent?: unknown;
};

type UploadJobQuery = {
  mediaType?: unknown;
  quality?: unknown;
  consent?: unknown;
};

const allowedUploadExtensions = new Set([
  ".aac",
  ".flac",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
]);

function isAllowedUpload(filename: string, mimetype: string) {
  return /^(audio|video)\//i.test(mimetype)
    || allowedUploadExtensions.has(extname(filename).toLowerCase());
}

class TaskQueue {
  private active = 0;
  private readonly pending: Array<() => Promise<void>> = [];

  constructor(private readonly concurrency: number) {}

  add(task: () => Promise<void>) {
    this.pending.push(task);
    this.runNext();
  }

  private runNext() {
    while (this.active < this.concurrency) {
      const task = this.pending.shift();
      if (!task) return;

      this.active += 1;
      void task().finally(() => {
        this.active -= 1;
        this.runNext();
      });
    }
  }
}

function requireRightsConsent(consent: unknown) {
  if (consent !== true) {
    throw new ApiError(
      "Confirme que você possui autorização para processar este conteúdo.",
      400,
      "RIGHTS_CONFIRMATION_REQUIRED",
    );
  }
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(`${fieldName} é obrigatório.`, 400, "INVALID_INPUT");
  }
  return value.trim();
}

function serializeJob(job: ConversionJob) {
  return {
    id: job.id,
    status: job.status,
    mediaType: job.mediaType,
    quality: job.quality,
    createdAt: new Date(job.createdAt).toISOString(),
    expiresAt: new Date(job.expiresAt).toISOString(),
    size: job.size ?? null,
    error: job.error ?? null,
    downloadUrl: job.status === "ready" ? `/api/jobs/${job.id}/download` : null,
  };
}

export async function buildApp(options: {
  logger?: boolean;
  convert?: typeof convertMedia;
} = {}) {
  const app = Fastify({
    logger: options.logger ?? process.env.NODE_ENV !== "test",
    bodyLimit: 64 * 1024,
  });
  const jobs = new Map<string, ConversionJob>();
  const queue = new TaskQueue(config.maxConcurrentJobs);
  const jobsRoot = join(tmpdir(), "vibeload-jobs");
  const mediaConverter = options.convert ?? convertMedia;

  await mkdir(jobsRoot, { recursive: true });

  await app.register(cors, {
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origem não permitida."), false);
    },
  });

  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 0,
      fileSize: config.maxUploadBytes,
    },
  });

  await app.register(rateLimit, {
    max: 60,
    timeWindow: "1 minute",
  });

  async function removeJobFiles(job: ConversionJob) {
    const directory = join(jobsRoot, job.id);
    await rm(directory, { recursive: true, force: true });
  }

  async function processJob(job: ConversionJob) {
    const directory = join(jobsRoot, job.id);
    const sourceDestination = join(directory, "source.media");

    try {
      await mkdir(directory, { recursive: true });
      let sourcePath = job.sourcePath;

      if (!sourcePath) {
        if (!job.url) throw new ApiError("A origem da mídia não foi encontrada.", 400, "SOURCE_NOT_FOUND");
        job.status = "downloading";
        job.updatedAt = Date.now();
        const source = await downloadRemoteMedia(job.url, sourceDestination);
        sourcePath = source.path;
      }

      const profile = getProfile(job.mediaType, job.quality);
      const outputPath = join(directory, `vibeload-${job.id}.${profile.extension}`);
      job.status = "converting";
      job.updatedAt = Date.now();

      await mediaConverter(sourcePath, outputPath, profile);
      await unlink(sourcePath).catch(() => undefined);

      const outputStats = await stat(outputPath);
      job.status = "ready";
      job.outputPath = outputPath;
      job.extension = profile.extension;
      job.mimeType = profile.mimeType;
      job.size = outputStats.size;
      job.updatedAt = Date.now();
      job.expiresAt = Date.now() + config.jobTtlMs;
    } catch (error) {
      job.status = "failed";
      job.updatedAt = Date.now();
      job.error = error instanceof ApiError ? error.message : "Falha inesperada durante a conversão.";
      await removeJobFiles(job).catch(() => undefined);
    }
  }

  const cleanupTimer = globalThis.setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of jobs) {
      if (job.expiresAt > now) continue;
      jobs.delete(jobId);
      void removeJobFiles(job).catch(() => undefined);
    }
  }, Math.min(config.jobTtlMs, 60_000));
  cleanupTimer.unref();

  app.addHook("onClose", async () => {
    globalThis.clearInterval(cleanupTimer);
  });

  app.get("/", async () => ({
    name: "VibeLoad API",
    status: "online",
    policy: "Somente conteúdo próprio, autorizado ou em domínio público.",
  }));

  app.get("/health", async () => ({
    status: "ok",
    revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local",
  }));

  app.post<{ Body: AnalyzeBody }>("/api/analyze", async (request) => {
    requireRightsConsent(request.body?.consent);
    const url = requireString(request.body?.url, "URL");
    parseRemoteUrl(url);
    const metadata = await inspectRemoteMedia(url);

    return {
      ...metadata,
      formats: conversionProfiles,
      maxSourceBytes: config.maxSourceBytes,
    };
  });

  app.post<{ Body: CreateJobBody }>("/api/jobs", async (request, reply) => {
    requireRightsConsent(request.body?.consent);
    const url = requireString(request.body?.url, "URL");
    const mediaType = requireString(request.body?.mediaType, "Tipo de mídia");
    const quality = requireString(request.body?.quality, "Qualidade");
    parseRemoteUrl(url);
    getProfile(mediaType, quality);

    const now = Date.now();
    const job: ConversionJob = {
      id: randomUUID(),
      url,
      mediaType: mediaType as MediaType,
      quality,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + config.jobTtlMs,
    };

    jobs.set(job.id, job);
    queue.add(() => processJob(job));

    return reply.code(202).send({ job: serializeJob(job) });
  });

  app.post<{ Querystring: UploadJobQuery }>("/api/uploads", async (request, reply) => {
    requireRightsConsent(request.query?.consent === "true");
    const mediaType = requireString(request.query?.mediaType, "Tipo de mídia");
    const quality = requireString(request.query?.quality, "Qualidade");
    getProfile(mediaType, quality);

    const upload = await request.file();
    if (!upload) throw new ApiError("Selecione um arquivo de áudio ou vídeo.", 400, "UPLOAD_REQUIRED");
    if (!isAllowedUpload(upload.filename, upload.mimetype)) {
      upload.file.resume();
      throw new ApiError("O formato deste arquivo não é compatível.", 415, "UNSUPPORTED_UPLOAD_TYPE");
    }

    const now = Date.now();
    const jobId = randomUUID();
    const directory = join(jobsRoot, jobId);
    const sourcePath = join(directory, "source.upload");

    await mkdir(directory, { recursive: false });
    try {
      await pipeline(upload.file, createWriteStream(sourcePath, { flags: "wx" }));
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        throw new ApiError("O arquivo excede o limite de 100 MB.", 413, "UPLOAD_TOO_LARGE");
      }
      throw error;
    }

    const sourceStats = await stat(sourcePath);
    if (sourceStats.size === 0) {
      await rm(directory, { recursive: true, force: true });
      throw new ApiError("O arquivo enviado está vazio.", 400, "EMPTY_UPLOAD");
    }

    const job: ConversionJob = {
      id: jobId,
      sourcePath,
      sourceName: basename(upload.filename).slice(0, 200),
      mediaType: mediaType as MediaType,
      quality,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + config.jobTtlMs,
    };

    jobs.set(job.id, job);
    queue.add(() => processJob(job));
    return reply.code(202).send({ job: serializeJob(job) });
  });

  app.get<{ Params: { id: string } }>("/api/jobs/:id", async (request) => {
    const job = jobs.get(request.params.id);
    if (!job) throw new ApiError("Conversão não encontrada ou expirada.", 404, "JOB_NOT_FOUND");
    return { job: serializeJob(job) };
  });

  app.get<{ Params: { id: string } }>("/api/jobs/:id/download", async (request, reply) => {
    const job = jobs.get(request.params.id);
    if (!job || job.status !== "ready" || !job.outputPath || !job.extension || !job.mimeType) {
      throw new ApiError("O arquivo ainda não está disponível ou já expirou.", 404, "DOWNLOAD_NOT_READY");
    }

    const filename = `vibeload-${job.quality.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${job.extension}`;
    reply.header("Content-Type", job.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    reply.header("Content-Length", String(job.size ?? 0));
    return reply.send(createReadStream(job.outputPath));
  });

  app.delete<{ Params: { id: string } }>("/api/jobs/:id", async (request, reply) => {
    const job = jobs.get(request.params.id);
    if (!job) return reply.code(204).send();
    jobs.delete(job.id);
    await removeJobFiles(job).catch(() => undefined);
    return reply.code(204).send();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: "Falha interna do serviço." },
    });
  });

  return app;
}

export type VibeLoadApi = FastifyInstance;
