import { ApiError } from "./errors.js";

export type MediaType = "video" | "audio";

export type ConversionProfile = {
  quality: string;
  format: string;
  extension: string;
  mimeType: string;
  ffmpegArgs: string[];
};

export const conversionProfiles: Record<MediaType, ConversionProfile[]> = {
  video: [
    {
      quality: "4K",
      format: "MP4",
      extension: "mp4",
      mimeType: "video/mp4",
      ffmpegArgs: ["-vf", "scale=-2:min(2160\\,ih)", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    },
    {
      quality: "1080p",
      format: "MP4",
      extension: "mp4",
      mimeType: "video/mp4",
      ffmpegArgs: ["-vf", "scale=-2:min(1080\\,ih)", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"],
    },
    {
      quality: "720p",
      format: "MP4",
      extension: "mp4",
      mimeType: "video/mp4",
      ffmpegArgs: ["-vf", "scale=-2:min(720\\,ih)", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart"],
    },
    {
      quality: "480p",
      format: "WEBM",
      extension: "webm",
      mimeType: "video/webm",
      ffmpegArgs: ["-vf", "scale=-2:min(480\\,ih)", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-c:a", "libopus", "-b:a", "128k"],
    },
  ],
  audio: [
    {
      quality: "320 kbps",
      format: "MP3",
      extension: "mp3",
      mimeType: "audio/mpeg",
      ffmpegArgs: ["-vn", "-c:a", "libmp3lame", "-b:a", "320k"],
    },
    {
      quality: "256 kbps",
      format: "MP3",
      extension: "mp3",
      mimeType: "audio/mpeg",
      ffmpegArgs: ["-vn", "-c:a", "libmp3lame", "-b:a", "256k"],
    },
    {
      quality: "192 kbps",
      format: "MP3",
      extension: "mp3",
      mimeType: "audio/mpeg",
      ffmpegArgs: ["-vn", "-c:a", "libmp3lame", "-b:a", "192k"],
    },
    {
      quality: "128 kbps",
      format: "M4A",
      extension: "m4a",
      mimeType: "audio/mp4",
      ffmpegArgs: ["-vn", "-c:a", "aac", "-b:a", "128k"],
    },
  ],
};

export function getProfile(mediaType: string, quality: string) {
  if (mediaType !== "video" && mediaType !== "audio") {
    throw new ApiError("Tipo de mídia inválido.", 400, "INVALID_MEDIA_TYPE");
  }

  const profile = conversionProfiles[mediaType].find((item) => item.quality === quality);
  if (!profile) {
    throw new ApiError("Qualidade não disponível.", 400, "INVALID_QUALITY");
  }

  return profile;
}
