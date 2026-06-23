import fs from 'node:fs/promises';
import path from 'node:path';
import { validatePost } from '../src/render.mjs';

const dir = path.resolve('posts');
let failed = 0;
try {
  const files = (await fs.readdir(dir)).filter((x) => x.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const post = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8'));
      const errors = validatePost(post);
      if (errors.length) {
        failed += 1;
        console.error(file, errors.join('; '));
      } else {
        console.log('ok', file);
      }
    } catch (error) {
      failed += 1;
      console.error(file, error.message);
    }
  }
} catch {
  console.log('no posts directory');
}
if (failed) process.exit(1);
