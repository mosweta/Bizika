// src/features/lessons/editor/R2UploadHelper.js
import R2Service from "../../../services/r2service";

export const UPLOAD_LIMITS = {
  image: 5 * 1024 * 1024,        // 5MB
  file: 50 * 1024 * 1024,        // 50MB
};

export function validateFile(file, kind) {
  if (!file) return { valid: false, error: "No file selected" };
  const limit = UPLOAD_LIMITS[kind];
  if (limit && file.size > limit) {
    return {
      valid: false,
      error: `File is too large. Max ${Math.round(limit / (1024 * 1024))}MB.`,
    };
  }
  if (kind === "image" && !file.type.startsWith("image/")) {
    return { valid: false, error: "Please select an image file." };
  }
  return { valid: true };
}

/**
 * Upload a file to R2 and return { url, key, size, contentType }.
 * Throws on failure.
 */
export async function uploadToR2(file, { folder, lessonId, onProgress }) {
  const upload = await R2Service.uploadFile(
    file,
    {
      folder: folder || "lesson-media",
      lessonId: lessonId || "unassigned",
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    },
    onProgress
  );

  if (!upload.success || !upload.data) {
    throw new Error(upload.error || "Upload failed");
  }

  return {
    url: upload.data.url,
    key: upload.data.key,
    size: upload.data.size,
    contentType: upload.data.contentType || file.type,
    name: file.name,
  };
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}