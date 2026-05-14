const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi", ".mkv"];

export function isVideoUrl(url: string) {
  const normalized = url.toLowerCase().split("?")[0].split("#")[0];
  return VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(ext));
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}
