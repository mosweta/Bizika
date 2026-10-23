// src/features/lessons/editor/VideoUrlParser.js

export function parseVideoUrl(url) {
  if (!url || typeof url !== "string") return null;

  // YouTube: watch, youtu.be, embed, shorts
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of ytPatterns) {
    const m = url.match(re);
    if (m) return { provider: "youtube", id: m[1] };
  }

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { provider: "vimeo", id: vimeo[1] };

  // Direct video file
  if (/\.(mp4|webm|mov|ogv)(\?.*)?$/i.test(url)) {
    return { provider: "direct", url };
  }

  // Unknown but valid-looking URL — allow it as direct
  if (/^https?:\/\//i.test(url)) {
    return { provider: "direct", url };
  }

  return null;
}

export function buildEmbedUrl(parsed) {
  if (!parsed) return null;
  switch (parsed.provider) {
    case "youtube":
      return `https://www.youtube.com/embed/${parsed.id}`;
    case "vimeo":
      return `https://player.vimeo.com/video/${parsed.id}`;
    case "direct":
      return parsed.url;
    default:
      return null;
  }
}