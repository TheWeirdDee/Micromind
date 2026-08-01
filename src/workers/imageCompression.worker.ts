type ResizeRequest = { buffer: ArrayBuffer; mimeType: string; maxDimension: number; quality: number };

self.onmessage = async (event: MessageEvent<ResizeRequest>) => {
  try {
    const { buffer, mimeType, maxDimension, quality } = event.data;
    const bitmap = await createImageBitmap(new Blob([buffer], { type: mimeType }));
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const output = await canvas.convertToBlob({ type: 'image/webp', quality });
    const outputBuffer = await output.arrayBuffer();
    self.postMessage({ ok: true, buffer: outputBuffer, type: output.type }, { transfer: [outputBuffer] });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Image optimization failed.' });
  }
};

export {};