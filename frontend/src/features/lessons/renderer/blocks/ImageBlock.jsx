// src/features/lessons/renderer/blocks/ImageBlock.jsx
import { useState } from "react";
import { X } from "lucide-react";

export function ImageBlock({ url, alt = "", caption }) {
  const [lightbox, setLightbox] = useState(false);

  if (!url) return null;

  return (
    <>
      <figure className="my-6">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block w-full rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <img
            src={url}
            alt={alt}
            loading="lazy"
            className="w-full h-auto max-h-[500px] object-contain bg-slate-50"
          />
        </button>
        {caption && (
          <figcaption className="mt-2 text-xs text-center text-slate-500">
            {caption}
          </figcaption>
        )}
      </figure>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={url}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}