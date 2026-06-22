import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const graphVersion = process.env.GRAPH_API_VERSION || 'v23.0';

app.use(express.json({ limit: '30mb' }));
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

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Cloudinary upload failed.');
  }
  return result.secure_url;
}

async function graphPost(pathname, params) {
  requiredEnv(['IG_USER_ID', 'INSTAGRAM_ACCESS_TOKEN']);
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pathname}`);
  const body = new URLSearchParams({
    ...params,
    access_token: process.env.INSTAGRAM_ACCESS_TOKEN
  });

  const response = await fetch(url, { method: 'POST', body });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Instagram Graph API request failed.');
  }
  return result;
}

async function createCarouselItem(imageUrl) {
  const igUserId = process.env.IG_USER_ID;
  const result = await graphPost(`${igUserId}/media`, {
    image_url: imageUrl,
    is_carousel_item: 'true'
  });
  return result.id;
}

async function createCarouselContainer(children, caption) {
  const igUserId = process.env.IG_USER_ID;
  const result = await graphPost(`${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption
  });
  return result.id;
}

async function publishContainer(creationId) {
  const igUserId = process.env.IG_USER_ID;
  const result = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId
  });
  return result.id;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    graphVersion,
    dryRunOnly: process.env.DRY_RUN_ONLY === 'true',
    hasInstagramConfig: Boolean(process.env.IG_USER_ID && process.env.INSTAGRAM_ACCESS_TOKEN),
    hasCloudinaryConfig: Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  });
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

    if (uploadedUrls.length < 2 || uploadedUrls.length > 10) {
      return res.status(400).json({ ok: false, error: 'Instagram carousel publishing needs 2 to 10 image URLs.' });
    }

    const payloadPreview = {
      images: uploadedUrls,
      caption,
      graphVersion
    };

    if (dryRun || process.env.DRY_RUN_ONLY === 'true') {
      return res.json({ ok: true, dryRun: true, ...payloadPreview });
    }

    const children = [];
    for (const imageUrl of uploadedUrls) {
      children.push(await createCarouselItem(imageUrl));
    }

    const creationId = await createCarouselContainer(children, caption);
    const mediaId = await publishContainer(creationId);

    res.json({
      ok: true,
      dryRun: false,
      mediaId,
      creationId,
      children,
      ...payloadPreview
    });
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
