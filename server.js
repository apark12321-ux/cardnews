import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { getCarouselLimit, getInstagramAccountStatus, publishCarousel } from './src/instagramPublisher.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const graphVersion = process.env.GRAPH_API_VERSION || 'v23.0';

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));

function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    const err = new Error(`Missing environment variables: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
}

function cloudinarySignature(params, secret) {
  const source = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(source + secret).digest('hex');
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL.');
  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return new Blob([buffer], { type: contentType });
}

async function uploadToCloudinary({ dataUrl, fileName = 'cardnews.png' }) {
  requiredEnv(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER || 'yojeumdon-cardnews';
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = cloudinarySignature(params, apiSecret);

  const body = new FormData();
  body.append('file', dataUrlToBlob(dataUrl), fileName);
  body.append('api_key', apiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Cloudinary upload failed.');
  }
  return result.secure_url;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    graphVersion,
    carouselLimit: getCarouselLimit(),
    dryRunOnly: process.env.DRY_RUN_ONLY === 'true',
    hasInstagramConfig: Boolean(process.env.IG_USER_ID && process.env.INSTAGRAM_ACCESS_TOKEN),
    hasCloudinaryConfig: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  });
});

app.get('/api/instagram/account', async (req, res, next) => {
  try {
    const status = await getInstagramAccountStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload-image', async (req, res, next) => {
  try {
    const { dataUrl, fileName } = req.body;
    if (!dataUrl) return res.status(400).json({ ok: false, error: 'dataUrl is required.' });
    const imageUrl = await uploadToCloudinary({ dataUrl, fileName });
    res.json({ ok: true, imageUrl });
  } catch (error) {
    next(error);
  }
});

app.post('/api/publish/carousel', async (req, res, next) => {
  try {
    const { cards = [], imageUrls = [], caption = '', dryRun = false } = req.body;
    if (!caption.trim()) return res.status(400).json({ ok: false, error: 'caption is required.' });

    const uploadedUrls = [...imageUrls];
    for (let i = 0; i < cards.length; i += 1) {
      if (cards[i]?.dataUrl) {
        const url = await uploadToCloudinary({
          dataUrl: cards[i].dataUrl,
          fileName: cards[i].fileName || `yojeumdon-${String(i + 1).padStart(2, '0')}.png`
        });
        uploadedUrls.push(url);
      }
    }

    const result = await publishCarousel({ imageUrls: uploadedUrls, caption, dryRun });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, _next) => {
  const status = error.statusCode || 500;
  res.status(status).json({
    ok: false,
    error: error.message || 'Server error.'
  });
});

app.listen(port, () => {
  console.log(`Yojeumdon publisher running at http://localhost:${port}/public/publisher.html`);
});
