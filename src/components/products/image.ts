/** Client-side product photo compression: longest side ≤ 800px, JPEG ~0.8 → data URL. */

const MAX_DATA_URL_CHARS = 1_900_000; // backend limit is ~2.05M chars (≈1.5 MB)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No pudimos leer la imagen."));
    };
    img.src = url;
  });
}

export async function compressImage(file: File, maxSide = 800, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite procesar imágenes.");
  // JPEG has no alpha: paint white under transparent PNGs so they don't turn black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  while (dataUrl.length > MAX_DATA_URL_CHARS && q > 0.35) {
    q -= 0.15;
    dataUrl = canvas.toDataURL("image/jpeg", q);
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) throw new Error("La imagen es demasiado pesada incluso comprimida.");
  return dataUrl;
}
