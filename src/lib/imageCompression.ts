export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
}

/** Runs image decoding and resizing away from the UI thread when the browser supports it. */
export async function compressImage(file: File, options: ImageCompressionOptions = {}): Promise<Blob> {
  if (file.type === 'image/gif' || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return file;
  const buffer = await file.arrayBuffer();
  const worker = new Worker(new URL('../workers/imageCompression.worker.ts', import.meta.url), { type: 'module' });
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<{ ok: boolean; buffer?: ArrayBuffer; type?: string; error?: string }>) => {
      worker.terminate();
      if (!event.data.ok || !event.data.buffer) reject(new Error(event.data.error || 'Image optimization failed.'));
      else resolve(new Blob([event.data.buffer], { type: event.data.type || 'image/webp' }));
    };
    worker.onerror = () => { worker.terminate(); reject(new Error('Image optimization worker failed.')); };
    worker.postMessage({
      buffer,
      mimeType: file.type,
      maxDimension: options.maxDimension ?? 1600,
      quality: options.quality ?? 0.78,
    }, [buffer]);
  });
}