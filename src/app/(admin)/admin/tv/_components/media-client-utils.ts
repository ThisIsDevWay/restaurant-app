/**
 * Shared utilities for the TV media client components.
 */

/** Reads a video file's duration, dimensions, and generates a thumbnail JPEG. */
export async function readVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: Blob;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas not available"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Thumbnail generation failed"));
            return;
          }
          resolve({
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail: blob,
          });
        },
        "image/jpeg",
        0.8,
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video load error"));
    };

    video.src = url;
  });
}

/** Reads an image file's natural dimensions. */
export async function readImageMetadata(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load error"));
    };
    img.src = url;
  });
}

/**
 * Uploads a FormData payload to the given URL, reporting progress via callback.
 * Uses XMLHttpRequest so we can track the upload progress events.
 */
export function uploadWithProgress(
  url: string,
  data: FormData,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Error ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) msg = body.error;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Error de red"));
    xhr.send(data);
  });
}

/** Strips common UUID-like suffixes injected by ImageKit from a filename. */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/_[a-zA-Z0-9]{6,}$/, "")
    .replace(/[-_]/g, " ")
    .trim();
}
