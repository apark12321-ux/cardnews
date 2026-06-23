const REPO = process.env.GITHUB_QUEUE_REPO || 'apark12321-ux/cardnews';
const BRANCH = process.env.GITHUB_QUEUE_BRANCH || 'main';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function slugify(text) {
  const base = String(text || 'post')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
  return base || 'post';
}

function kstStamp() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}${get('month')}${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
}

function validatePost(post) {
  const errors = [];
  if (!post || typeof post !== 'object') errors.push('post must be an object.');
  if (!String(post?.title || post?.topic || '').trim()) errors.push('title is required.');
  if (!String(post?.caption || '').trim()) errors.push('caption is required.');
  if (!Array.isArray(post?.cards) || post.cards.length < 2) errors.push('cards must contain at least 2 cards.');
  if (Array.isArray(post?.cards) && post.cards.length > 20) errors.push('cards must be 20 or fewer.');
  return errors;
}

function token() {
  return process.env.GITHUB_QUEUE_TOKEN || process.env.GH_QUEUE_TOKEN || '';
}

async function createGitHubFile({ path, content, message }) {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: BRANCH
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || `GitHub file create failed: HTTP ${response.status}`);
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      service: 'yojeumdon queue api',
      repo: REPO,
      branch: BRANCH,
      hasToken: Boolean(token())
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  try {
    if (!token()) {
      return json(res, 500, {
        ok: false,
        error: 'Vercel 환경변수 GITHUB_QUEUE_TOKEN이 없습니다. GitHub repo contents write 권한 PAT를 Vercel에 등록해야 합니다.'
      });
    }

    const raw = await readBody(req);
    const post = JSON.parse(raw);
    const errors = validatePost(post);
    if (errors.length) return json(res, 400, { ok: false, error: errors.join(' ') });

    const queuedAt = new Date().toISOString();
    const safeTitle = slugify(post.title || post.topic);
    const filename = `${kstStamp()}-${safeTitle}.json`;
    const filePath = `posts/${filename}`;
    const queuedPost = {
      ...post,
      schemaVersion: post.schemaVersion || 2,
      status: 'queued',
      slug: post.slug || filename.replace(/\.json$/i, ''),
      queuedAt,
      publishedAt: null,
      cloudinaryUrls: [],
      instagram: null
    };

    const created = await createGitHubFile({
      path: filePath,
      content: `${JSON.stringify(queuedPost, null, 2)}\n`,
      message: `queue post: ${post.title || post.topic}`
    });

    return json(res, 200, {
      ok: true,
      path: filePath,
      queuedAt,
      htmlUrl: created?.content?.html_url || `https://github.com/${REPO}/blob/${BRANCH}/${filePath}`,
      commit: created?.commit?.sha
    });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
}
