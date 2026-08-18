export const MAX_UPLOAD_FILE_MB = 2;
export const MAX_UPLOAD_FILE_BYTES = MAX_UPLOAD_FILE_MB * 1024 * 1024;

export function fileTooLargeMessage(fileName?: string) {
  const name = fileName ? `"${fileName}" is` : 'This file is';
  return `${name} too large. Please upload a document smaller than ${MAX_UPLOAD_FILE_MB} MB.`;
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function blobToFile(blob: Blob, name: string, type: string) {
  const base = name.replace(/\.[^.]+$/, '') || 'document';
  return new File([blob], `${base}.jpg`, { type, lastModified: Date.now() });
}

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1280;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.72, 0.58, 0.45]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) continue;
    if (blob.size <= MAX_UPLOAD_FILE_BYTES) {
      return blobToFile(blob, file.name, 'image/jpeg');
    }
    if (quality === 0.45) {
      return blobToFile(blob, file.name, 'image/jpeg');
    }
  }
  return file;
}

export async function prepareAdmissionFile(file: File): Promise<File> {
  if (isPdf(file)) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new Error(fileTooLargeMessage(file.name));
    }
    return file;
  }

  if (!file.type.startsWith('image/')) {
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new Error(fileTooLargeMessage(file.name));
    }
    return file;
  }

  try {
    const prepared = file.size > 350 * 1024 ? await compressImage(file) : file;
    if (prepared.size > MAX_UPLOAD_FILE_BYTES) {
      throw new Error(fileTooLargeMessage(file.name));
    }
    return prepared;
  } catch (err) {
    if (err instanceof Error && err.message.includes('too large')) throw err;
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      throw new Error(fileTooLargeMessage(file.name));
    }
    return file;
  }
}
