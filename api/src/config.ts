function readPositiveInteger(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readOrigins() {
  const defaults = [
    "https://isaacfirmino.github.io",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
  ];

  return new Set(
    (process.env.ALLOWED_ORIGINS ?? defaults.join(","))
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export const config = {
  host: process.env.HOST ?? "0.0.0.0",
  port: readPositiveInteger("PORT", 8787),
  allowedOrigins: readOrigins(),
  maxSourceBytes: readPositiveInteger("MAX_SOURCE_BYTES", 250 * 1024 * 1024),
  maxConcurrentJobs: readPositiveInteger("MAX_CONCURRENT_JOBS", 1),
  downloadTimeoutMs: readPositiveInteger("DOWNLOAD_TIMEOUT_MS", 2 * 60 * 1000),
  conversionTimeoutMs: readPositiveInteger("CONVERSION_TIMEOUT_MS", 10 * 60 * 1000),
  jobTtlMs: readPositiveInteger("JOB_TTL_MS", 15 * 60 * 1000),
};
