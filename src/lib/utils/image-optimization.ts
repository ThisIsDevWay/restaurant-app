/**
 * Utilidades para optimizar imágenes en el cliente antes de subirlas a Supabase.
 * Esto ayuda a mantener el proyecto dentro del Free Tier de Supabase (5GB Egress).
 */

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg" | "image/png";
}

/**
 * Redimensiona y comprime una imagen, devolviendo un nuevo archivo WebP.
 */
export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = "image/webp",
  } = options;

  // Si es un SVG, no lo tocamos
  if (file.type === "image/svg+xml") return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo el aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo obtener el contexto del canvas"));
          return;
        }

        // Dibujar imagen en el canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Error al convertir imagen a Blob"));
              return;
            }

            // Crear un nuevo archivo con extensión .webp si aplica
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + (format === "image/webp" ? ".webp" : "");
            const optimizedFile = new File([blob], newFileName, {
              type: format,
              lastModified: Date.now(),
            });

            resolve(optimizedFile);
          },
          format,
          quality
        );
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
  });
}
