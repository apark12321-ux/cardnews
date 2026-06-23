#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { renderPostToFiles, validatePost } from '../src/render.mjs';
import { hasCloudinaryConfig, uploadFiles } from '../src/cloudinary.mjs';
import { publishCarousel } from '../src/instagramPublisher.mjs';

dotenv.config();

const POSTS_DIR = path.resolve(process.cwd(), 'posts');
const OUT_DIR = path.resolve(process.cwd(), 'out');
const STATUS_DIR = path.resolve(process.cwd(), '_automation');
const STATUS_FILE = path.join(STATUS_DIR, 'status.json');

function parseArgs(argv) {
  const result = { dryRun: false, file: '' };
  const args = [...argv];
  while (args.length) {
    const token = args.shift();
    if (token === '--dry-run') result.dryRun = true;
    else if (token === '--file') result.file = args.shift() || '';
    else if (!token.startsWith('--') && !result.file) result.file = token;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (process.env.DRY_RUN_ONLY === 'true' || process.env.DRY_RUN === 'true') result.dryRun = true;
  return result;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJSON(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function sortPosts(a, b) {
  return a.file.localeCompare(b.file, 'ko-KR');
}

async function listPostFiles() {
  if (!(await exists(POSTS_DIR))) return [];
  const entries = await fs.readdir(POSTS_DIR);
  return entries
    .filter((name) => name.endsWith('.json'))
    .map((file) => ({ file, filePath: path.join(POSTS_DIR, file) }))
    .sort(sortPosts);
}

async function selectPost(args) {
  if (args.file) {
    const filePath = path.resolve(process.cwd(), args.file);
    const post = await readJSON(filePath);
    return { file: path.basename(filePath), filePath, post };
  }

  const files = await listPostFiles();
  for (const item of files) {
    const post = await readJSON(item.filePath).catch((error) => ({ status: 'invalid', error: error.message }));
    if (String(post.status || '').toLowerCase() === 'queued') return { ...item, post };
  }
  return null;
}

function normalizeSlug(selected) {
  const fromPost = selected.post.slug || selected.post.title || selected.file.replace(/\.json$/i, '');
  return String(fromPost)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || selected.file.replace(/\.json$/i, '');
}

async function writeStatus(status) {
  await writeJSON(STATUS_FILE, {
    ...status,
    checkedAt: new Date().toISOString()
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = await selectPost(args);

  if (!selected) {
    const status = {
      ok: true,
      state: 'idle',
      message: 'queued 상태의 발행 대기 글이 없습니다.',
      dryRun: args.dryRun
    };
    await writeStatus(status);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const validationErrors = validatePost(selected.post);
  if (validationErrors.length) {
    throw new Error(`${selected.file} 검증 실패:\n${validationErrors.join('\n')}`);
  }

  const slug = normalizeSlug(selected);
  const outputDir = path.join(OUT_DIR, slug);
  console.log(`Selected post: ${selected.file}`);
  console.log(`Dry run: ${args.dryRun ? 'true' : 'false'}`);

  const renderedFiles = await renderPostToFiles(selected.post, outputDir);
  console.log(`Rendered ${renderedFiles.length} card(s) to ${path.relative(process.cwd(), outputDir)}`);

  let imageUrls = [];
  if (hasCloudinaryConfig()) {
    imageUrls = await uploadFiles(renderedFiles, { slug });
    console.log(`Uploaded ${imageUrls.length} image(s) to Cloudinary.`);
  } else if (args.dryRun) {
    console.log('Cloudinary config is missing. Dry run continues with local render artifacts only.');
  } else {
    throw new Error('Cloudinary secrets are missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to GitHub Secrets.');
  }

  let instagramResult = null;
  if (imageUrls.length) {
    instagramResult = await publishCarousel({
      imageUrls,
      caption: selected.post.caption,
      dryRun: args.dryRun
    });
    console.log(JSON.stringify(instagramResult, null, 2));
  } else {
    instagramResult = { ok: true, dryRun: true, skippedPublish: true, reason: 'No Cloudinary URLs in dry run.' };
  }

  const runState = {
    ok: true,
    state: args.dryRun ? 'dry_run_completed' : 'published',
    file: `posts/${selected.file}`,
    title: selected.post.title || selected.post.topic,
    dryRun: args.dryRun,
    renderedFiles: renderedFiles.map((file) => path.relative(process.cwd(), file)),
    imageUrls,
    instagram: instagramResult
  };

  if (!args.dryRun) {
    selected.post.status = 'published';
    selected.post.publishedAt = new Date().toISOString();
    selected.post.cloudinaryUrls = imageUrls;
    selected.post.instagram = instagramResult;
    await writeJSON(selected.filePath, selected.post);
  }

  await writeStatus(runState);
  console.log(JSON.stringify(runState, null, 2));
}

main().catch(async (error) => {
  const status = {
    ok: false,
    state: 'failed',
    message: error.message,
    dryRun: process.env.DRY_RUN_ONLY === 'true' || process.argv.includes('--dry-run')
  };
  await writeStatus(status).catch(() => {});
  console.error(JSON.stringify(status, null, 2));
  process.exitCode = 1;
});
