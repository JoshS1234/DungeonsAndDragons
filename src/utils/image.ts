/**
 * Shrink an image so its longest side is at most `maxSize` pixels and
 * re-encode it as JPEG, so portraits stay small (typically 20–60 kB).
 */
export const resizeImage = async (file: Blob, maxSize = 512): Promise<Blob> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Couldn't read that image.");
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  // JPEG has no transparency: give transparent images a white background
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Couldn't process that image.")),
      "image/jpeg",
      0.85
    )
  );
};
