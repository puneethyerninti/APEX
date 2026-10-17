export const MAX_MATRIMONY_PHOTOS = 5;
export const MAX_MATRIMONY_PHOTO_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_MATRIMONY_PHOTO_BYTES = 1024 * 1024;
export const MAX_MATRIMONY_PHOTO_DIMENSION = 1600;

const photoTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function validateMatrimonyPhotos(files: readonly File[], retainedCount = 0): void {
  if (!Number.isInteger(retainedCount) || retainedCount < 0 || retainedCount + files.length > MAX_MATRIMONY_PHOTOS) {
    throw new Error('Keep up to 5 photos in total. Remove a photo before adding more.');
  }
  for (const file of files) {
    if (!photoTypes.has(file.type.toLowerCase()) && !(file.type === '' && /\.(jpe?g|png|webp)$/i.test(file.name))) {
      throw new Error(`"${file.name}" is not a supported photo. Choose a JPEG, PNG or WebP file.`);
    }
    if (!file.size) throw new Error(`"${file.name}" is empty. Choose the original photo again.`);
    if (file.size > MAX_MATRIMONY_PHOTO_INPUT_BYTES) {
      throw new Error(`"${file.name}" exceeds 20 MB. Choose a smaller original photo.`);
    }
  }
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Photo processing was cancelled.', 'AbortError');
}

async function processPhoto(file: File, signal?: AbortSignal): Promise<File> {
  checkAborted(signal);
  const image = new Image();
  const url = URL.createObjectURL(file);
  let canvas: HTMLCanvasElement | undefined;
  try {
    // Native image decoding honors the browser's default EXIF orientation.
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        image.onload = null;
        image.onerror = null;
        signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new DOMException('Photo processing was cancelled.', 'AbortError'));
      image.onload = () => finish();
      image.onerror = () => finish(new Error(`Could not open "${file.name}". Export it as JPEG, PNG or WebP and try again.`));
      signal?.addEventListener('abort', abort, { once: true });
      image.src = url;
      if (signal?.aborted) abort();
    });
    checkAborted(signal);
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('The photo has no readable dimensions.');
    const scale = Math.min(1, MAX_MATRIMONY_PHOTO_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo processing is unavailable. Try an updated browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.22, 0.12]) {
      checkAborted(signal);
      const blob = await new Promise<Blob>((resolve, reject) => {
        const abort = () => reject(new DOMException('Photo processing was cancelled.', 'AbortError'));
        signal?.addEventListener('abort', abort, { once: true });
        try {
          canvas!.toBlob(value => {
            signal?.removeEventListener('abort', abort);
            if (value) resolve(value); else reject(new Error('The browser could not encode the photo.'));
          }, 'image/jpeg', quality);
        } catch (error) {
          signal?.removeEventListener('abort', abort);
          reject(error);
        }
      });
      checkAborted(signal);
      if (blob.type !== 'image/jpeg' || !blob.size) throw new Error('The browser could not create a JPEG photo.');
      if (blob.size <= MAX_MATRIMONY_PHOTO_BYTES) {
        return new File([blob], (file.name.replace(/\.[^.]*$/, '') || 'photo') + '.jpg', { type: 'image/jpeg', lastModified: file.lastModified });
      }
    }
    throw new Error('Could not reduce this photo below 1 MB. Choose a smaller photo or crop it and try again.');
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    throw new Error(`Could not prepare "${file.name}". ${error instanceof Error ? error.message : 'Try a smaller photo or an updated browser.'}`);
  } finally {
    image.onload = null;
    image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

/** Returns a complete new batch, or rejects without changing the caller's selection. */
export async function processMatrimonyPhotos(files: readonly File[], signal?: AbortSignal): Promise<File[]> {
  validateMatrimonyPhotos(files);
  checkAborted(signal);
  const prepared: File[] = [];
  for (const file of files) {
    const photo = await processPhoto(file, signal);
    checkAborted(signal);
    prepared.push(photo);
  }
  return prepared;
}
