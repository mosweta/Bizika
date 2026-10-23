// src/features/lessons/renderer/blocks/VideoBlock.jsx

function parseVideoUrl(url) {
  if (!url) return null;
  // YouTube
  const yt =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/) ||
    null;
  if (yt) return { provider: "youtube", id: yt[1] };
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { provider: "vimeo", id: vimeo[1] };
  // Direct
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
    return { provider: "direct", url };
  }
  return null;
}

export function VideoBlock({ url, caption }) {
  const parsed = parseVideoUrl(url);

  if (!parsed) return null;

  return (
    <figure className="my-6">
      <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black">
        {parsed.provider === "youtube" && (
          <iframe
            src={`https://www.youtube.com/embed/${parsed.id}`}
            title={caption || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        )}
        {parsed.provider === "vimeo" && (
          <iframe
            src={`https://player.vimeo.com/video/${parsed.id}`}
            title={caption || "Video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        )}
        {parsed.provider === "direct" && (
          <video src={parsed.url} controls className="w-full h-full">
            Your browser does not support the video tag.
          </video>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-xs text-center text-slate-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}