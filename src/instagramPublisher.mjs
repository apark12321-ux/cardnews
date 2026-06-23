function requiredEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    const err = new Error(`Missing environment variables: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
}

function getGraphVersion() {
  return process.env.GRAPH_API_VERSION || 'v23.0';
}

function getIgUserId() {
  requiredEnv(['IG_USER_ID']);
  return process.env.IG_USER_ID;
}

function getAccessToken() {
  requiredEnv(['INSTAGRAM_ACCESS_TOKEN']);
  return process.env.INSTAGRAM_ACCESS_TOKEN;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function assertCaption(caption) {
  if (!String(caption || '').trim()) {
    const err = new Error('caption is required.');
    err.statusCode = 400;
    throw err;
  }
}

export function getCarouselLimit() {
  const configured = Number(process.env.MAX_CAROUSEL_IMAGES || 10);
  if (!Number.isFinite(configured) || configured < 2) return 10;
  return Math.min(Math.floor(configured), 20);
}

export function normalizeImageUrls(imageUrls = []) {
  return imageUrls
    .map((url) => String(url || '').trim())
    .filter(Boolean);
}

export function assertImageUrls(imageUrls = []) {
  const urls = normalizeImageUrls(imageUrls);
  const max = getCarouselLimit();
  if (urls.length < 1) {
    const err = new Error('At least 1 image URL is required.');
    err.statusCode = 400;
    throw err;
  }
  if (urls.length > max) {
    const err = new Error(`Too many image URLs. Current limit is ${max}.`);
    err.statusCode = 400;
    throw err;
  }
  for (const url of urls) {
    if (!/^https:\/\//i.test(url)) {
      const err = new Error(`Instagram requires public HTTPS image URLs: ${url}`);
      err.statusCode = 400;
      throw err;
    }
  }
  return urls;
}

export async function graphGet(pathname, params = {}) {
  requiredEnv(['INSTAGRAM_ACCESS_TOKEN']);
  const graphVersion = getGraphVersion();
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  url.searchParams.set('access_token', getAccessToken());

  const response = await fetch(url);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Instagram Graph API GET request failed.');
  }
  return result;
}

export async function graphPost(pathname, params = {}) {
  requiredEnv(['INSTAGRAM_ACCESS_TOKEN']);
  const graphVersion = getGraphVersion();
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${pathname}`);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
  }
  body.set('access_token', getAccessToken());

  const response = await fetch(url, { method: 'POST', body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || 'Instagram Graph API POST request failed.');
  }
  return result;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForContainerReady(containerId, options = {}) {
  const shouldWait = options.waitForReady ?? normalizeBoolean(process.env.IG_WAIT_FOR_READY || 'true');
  if (!shouldWait) return { id: containerId, skipped: true };

  const maxAttempts = Number(options.maxAttempts || process.env.IG_READY_MAX_ATTEMPTS || 12);
  const intervalMs = Number(options.intervalMs || process.env.IG_READY_INTERVAL_MS || 5000);

  let lastStatus = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await graphGet(containerId, { fields: 'status_code,status' });
    lastStatus = status;
    if (status.status_code === 'FINISHED') return status;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(`Instagram media container failed: ${status.status || status.status_code}`);
    }
    await sleep(intervalMs);
  }

  throw new Error(`Instagram media container was not ready in time: ${JSON.stringify(lastStatus)}`);
}

export async function getInstagramAccountStatus() {
  requiredEnv(['IG_USER_ID', 'INSTAGRAM_ACCESS_TOKEN']);
  const igUserId = getIgUserId();
  const account = await graphGet(igUserId, { fields: 'id,username,name,account_type' });
  return {
    ok: true,
    graphVersion: getGraphVersion(),
    carouselLimit: getCarouselLimit(),
    account
  };
}

export async function createImageContainer(imageUrl, options = {}) {
  const igUserId = getIgUserId();
  const params = {
    image_url: imageUrl
  };
  if (options.isCarouselItem) params.is_carousel_item = 'true';
  if (options.caption) params.caption = options.caption;

  const result = await graphPost(`${igUserId}/media`, params);
  await waitForContainerReady(result.id, options);
  return result.id;
}

export async function createCarouselContainer(children, caption, options = {}) {
  const igUserId = getIgUserId();
  const result = await graphPost(`${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption
  });
  await waitForContainerReady(result.id, options);
  return result.id;
}

export async function publishContainer(creationId) {
  const igUserId = getIgUserId();
  const result = await graphPost(`${igUserId}/media_publish`, {
    creation_id: creationId
  });
  return result.id;
}

export async function publishSingleImage({ imageUrl, caption, dryRun = false, options = {} }) {
  assertCaption(caption);
  const [url] = assertImageUrls([imageUrl]);
  const payloadPreview = {
    type: 'single-image',
    images: [url],
    caption,
    graphVersion: getGraphVersion()
  };

  if (dryRun || normalizeBoolean(process.env.DRY_RUN_ONLY)) {
    return { ok: true, dryRun: true, ...payloadPreview };
  }

  const creationId = await createImageContainer(url, { ...options, caption });
  const mediaId = await publishContainer(creationId);
  return { ok: true, dryRun: false, mediaId, creationId, ...payloadPreview };
}

export async function publishCarousel({ imageUrls, caption, dryRun = false, options = {} }) {
  assertCaption(caption);
  const urls = assertImageUrls(imageUrls);
  if (urls.length < 2) {
    return publishSingleImage({ imageUrl: urls[0], caption, dryRun, options });
  }

  const payloadPreview = {
    type: 'carousel',
    images: urls,
    caption,
    graphVersion: getGraphVersion(),
    carouselLimit: getCarouselLimit()
  };

  if (dryRun || normalizeBoolean(process.env.DRY_RUN_ONLY)) {
    return { ok: true, dryRun: true, ...payloadPreview };
  }

  const children = [];
  for (const imageUrl of urls) {
    children.push(await createImageContainer(imageUrl, { ...options, isCarouselItem: true }));
  }

  const creationId = await createCarouselContainer(children, caption, options);
  const mediaId = await publishContainer(creationId);
  return { ok: true, dryRun: false, mediaId, creationId, children, ...payloadPreview };
}
