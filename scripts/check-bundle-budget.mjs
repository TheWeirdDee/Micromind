import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = join(process.cwd(), '.next', 'static', 'chunks');
const limits = {
  maxChunkGzipBytes: 250 * 1024,
  maxTotalGzipBytes: 2 * 1024 * 1024,
};

async function files(dir) {
  const result = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) result.push(...await files(path));
    else if (name.endsWith('.js')) result.push(path);
  }
  return result;
}

try {
  const chunks = await Promise.all((await files(root)).map(async (path) => {
    const gzipBytes = gzipSync(await readFile(path)).byteLength;
    return { path: relative(root, path), gzipBytes };
  }));
  chunks.sort((a, b) => b.gzipBytes - a.gzipBytes);
  const total = chunks.reduce((sum, item) => sum + item.gzipBytes, 0);
  const oversized = chunks.filter((item) => item.gzipBytes > limits.maxChunkGzipBytes);
  console.table(chunks.slice(0, 15).map((item) => ({ chunk: item.path, gzipKB: (item.gzipBytes / 1024).toFixed(1) })));
  console.log(`Total route chunks (gzip): ${(total / 1024).toFixed(1)} KB`);
  if (oversized.length || total > limits.maxTotalGzipBytes) {
    console.error('Bundle budget exceeded. Lazy-load or split the reported code before merging.');
    process.exitCode = 1;
  } else {
    console.log('Bundle budgets passed.');
  }
} catch (error) {
  console.error('No production build found. Run npm run build before npm run check:bundle.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}