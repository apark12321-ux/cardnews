import fs from 'node:fs/promises';
import path from 'node:path';
import { renderPostToFiles } from '../src/render.mjs';

const postDir = path.resolve('posts');
const outDir = path.resolve('out');
await fs.mkdir(outDir, { recursive: true });
let files = [];
try {
  files = (await fs.readdir(postDir)).filter((name) => name.endsWith('.json')).sort();
} catch {
  console.log('no posts directory');
}
for (const file of files) {
  const post = JSON.parse(await fs.readFile(path.join(postDir, file), 'utf8'));
  if (!Array.isArray(post.cards)) continue;
  const name = file.replace('.json', '');
  const rendered = await renderPostToFiles(post, path.join(outDir, name));
  console.log('rendered', file, rendered.length);
}
