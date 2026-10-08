/** Save a file in the browser via a temporary download link. */
export const downloadFile = (
  contents: BlobPart,
  fileName: string,
  type: string
) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** A safe file name from user text, e.g. "Thalia the Bold" → "Thalia_the_Bold". */
export const fileNameFor = (name: string, fallback: string) =>
  (name.trim() || fallback).replace(/[^\w-]+/g, "_");

/** Read a file the user picked as text. */
export const readTextFile = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
