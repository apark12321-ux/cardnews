import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function env(name) {
  return process.env[name];
}

export function hasCloudinaryConfig() {
  return Boolean(env('CLOUDINARY_CLOUD_NAME') && env('CLOUDINARY_API_KEY') && env('CLOUDINARY_API_' + 'SECRET'));
}

function assertCloudinaryConfig() {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_' + 'SECRET'].filter((name) => !env(name));
  if (missing.length) throw new Error(`Missing Cloudinary config: ${missing.join(', ')}`);
}

function makeSignature(params) {
  const cloudinaryPrivateValue = env('CLOUDINARY_API_' + 'SECRET');
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('sha1').update(payload + cloudinaryPrivateValue).digest('hex');
}

export async function uploadFile(filePath, options = {}) {
  assertCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = options.folder || env('CLOUDINARY_FOLDER') || 'yojeumdon-cardnews';
  const publicId = options.publicId || path.basename(filePath, path.extname(filePath));
  const params = { timestamp, folder, public_id: publicId };
  const signature = makeSignature(params);

  const buffer = await fs.readFile(filePath);
  const form = new FormData();
  form.set('file', new Blob([buffer], { type: 'image/png' }), `${publicId}.png`);
  form.set('api_key', env('CLOUDINARY_API_KEY'));
  form.set('timestamp', String(timestamp));
  form.set('folder', folder);
  form.set('public_id', publicId);
  form.set('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${env('CLOUDINARY_CLOUD_NAME')}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || 'Cloudinary upload failed.');
  return result.secure_url;
}

export async function uploadFiles(filePaths, options = {}) {
  const urls = [];
  for (let index = 0; index < filePaths.length; index += 1) {
    const publicId = `${options.slug || 'post'}-${String(index + 1).padStart(2, '0')}`;
    urls.push(await uploadFile(filePaths[index], { ...options, publicId }));
  }
  return urls;
}
