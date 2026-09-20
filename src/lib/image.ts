/** Compress images client-side before upload — keeps mobile uploads fast. */
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(async () => {
    // fallback via <img>
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url);
      return await drawToCanvas(img, maxDim, quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  if (bitmap instanceof Blob) return bitmap;

  const bmp = bitmap as ImageBitmap;
  const { width, height } = bmp;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("compress failed"))),
      "image/jpeg",
      quality
    );
  });
}

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function drawToCanvas(img: HTMLImageElement, maxDim: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", quality)
  );
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files).slice(0, 6);
  const out: string[] = [];
  for (const f of arr) {
    const blob = await compressImage(f);
    out.push(await fileToDataUrl(blob));
  }
  return out;
}
