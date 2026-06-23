#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { publishCarousel, getInstagramAccountStatus } from '../src/instagramPublisher.mjs';

dotenv.config();

function usage() {
  return `Usage:
  npm run publish:instagram -- posts/example-instagram-post.json --dry-run
  npm run publish:instagram -- --file posts/example-instagram-post.json

Options:
  --file <path>       JSON post file path
  --dry-run           Validate payload without publishing to Instagram
  --check-account     Check IG_USER_ID / token connection only
`;
}

function parseArgs(argv) {
  const args = [...argv];
  const result = { file: '', dryRun: false, checkAccount: false };

  while (args.length) {
    const token = args.shift();
    if (token === '--dry-run') result.dryRun = true;
    else if (token === '--check-account') result.checkAccount = true;
    else if (token === '--file') result.file = args.shift() || '';
    else if (!token.startsWith('--') && !result.file) result.file = token;
    else throw new Error(`Unknown argument: ${token}`);
  }

  return result;
}

function normalizePost(data) {
  const imageUrls = data.imageUrls || data.images || data.image_urls || [];
  const caption = data.caption || '';
  return {
    imageUrls,
    caption,
    dryRun: Boolean(data.dryRun)
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.checkAccount) {
    const status = await getInstagramAccountStatus();
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (!args.file) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), args.file);
  const raw = await fs.readFile(filePath, 'utf8');
  const data = JSON.parse(raw);
  const post = normalizePost(data);

  const result = await publishCarousel({
    imageUrls: post.imageUrls,
    caption: post.caption,
    dryRun: args.dryRun || post.dryRun
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
