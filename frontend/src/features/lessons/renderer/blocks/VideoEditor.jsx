// src/features/lessons/editor/blocks/VideoEditor.jsx
import { useState } from "react";
import { Video, Trash2, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { parseVideoUrl, buildEmbedUrl } from "../VideoUrlParser";

export function VideoEditor({ block, onChange }) {
  const [url, setUrl] = useState(block.url || "");
  const [caption, setCaption] = useState(block.caption || "");

  const parsed = parseVideoUrl(url);
  const previewUrl = parsed ? buildEmbedUrl(parsed) : null;

  const handleCommit = () => {
    onChange({ ...block, url: url.trim(), caption: caption.trim() });
  };

  const handleRemove = () => {
    onChange({ ...block, url: "", caption: "" });
    setUrl("");
    setCaption("");
  };

  if (block.url && parsed) {
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <div className="aspect-video bg-black">
          {parsed.provider === "youtube" && (
            <iframe
              src={`https://www.youtube.com/embed/${parsed.id}`}
              title={block.caption || "Video"}
              allowFullScreen
              className="w-full h-full"
            />
          )}
          {parsed.provider === "vimeo" && (
            <iframe
              src={`https://player.vimeo.com/video/${parsed.id}`}
              title={block.caption || "Video"}
              allowFullScreen
              className="w-full h-full"
            />
          )}
          {parsed.provider === "direct" && (
            <video src={parsed.url} controls className="w-full h-full" />
          )}
        </div>
        <div className="p-3 flex items-center gap-2 border-t border-slate-100">
          <input
            type="text"
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              onChange({ ...block, caption: e.target.value });
            }}
            placeholder="Caption (optional)"
            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
            title="Remove video"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Video className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">Add video</span>
      </div>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCommit();
          }
        }}
        placeholder="Paste a YouTube, Vimeo, or direct MP4 link"
        className="w-full text-sm border border-slate-200 rounded px-3 py-2 focus:outline-none focus:border-blue-800 bg-white"
      />

      {url && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {parsed ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-700">
                Detected {parsed.provider}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-amber-700">
                Unrecognized format. Try YouTube, Vimeo, or a direct video file.
              </span>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleCommit}
          disabled={!parsed}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Embed video
        </button>
      </div>
    </div>
  );
}