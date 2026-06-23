import fs from 'node:fs/promises';
import path from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const WIDTH = 1080;
const HEIGHT = 1350;
const SAFE_X = 86;
const FONT_FAMILY = 'Noto Sans CJK KR, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif';

const palette = {
  bg: '#0b1020',
  panel: '#111832',
  panel2: '#182244',
  text: '#f5f7ff',
  muted: '#a8b4d4',
  accent: '#f2b84b',
  coral: '#ff7a7a',
  line: '#2a365f',
  white: '#ffffff',
};

export function tryRegisterFonts() {
  const candidates = [
    ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans CJK KR'],
    ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 'Noto Sans CJK KR'],
    ['/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf', 'Noto Sans KR'],
    ['/System/Library/Fonts/AppleSDGothicNeo.ttc', 'Apple SD Gothic Neo'],
    ['C:/Windows/Fonts/malgun.ttf', 'Malgun Gothic'],
  ];
  for (const [fontPath, family] of candidates) {
    try {
      GlobalFonts.registerFromPath(fontPath, family);
    } catch (_) {
      // Optional font path. Ignore missing fonts.
    }
  }
}

function setFont(ctx, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
}

function drawBackground(ctx, type = 'default') {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, type === 'warning' ? '#20111a' : '#0b1020');
  gradient.addColorStop(1, '#111832');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = type === 'warning' ? palette.coral : palette.accent;
  ctx.beginPath();
  ctx.arc(930, 120, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath();
  ctx.arc(90, 1230, 290, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function wrapText(ctx, text, maxWidth) {
  const raw = String(text || '').replace(/<br\s*\/?>/gi, '\n');
  const paragraphs = raw.split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    const chars = [...paragraph.trim()];
    if (!chars.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const char of chars) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const lines = wrapText(ctx, text, maxWidth);
  const maxLines = options.maxLines || lines.length;
  const visible = lines.slice(0, maxLines);
  visible.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + visible.length * lineHeight;
}

function drawTag(ctx, label, type) {
  const tag = String(label || '요즘돈').trim();
  setFont(ctx, 30, 900);
  const w = ctx.measureText(tag).width + 52;
  const color = type === 'warning' ? palette.coral : palette.accent;
  fillRoundRect(ctx, SAFE_X, 86, w, 56, 28, color);
  ctx.fillStyle = '#101524';
  ctx.fillText(tag, SAFE_X + 26, 124);
}

function drawFooter(ctx, post, index, total) {
  ctx.strokeStyle = 'rgba(255,255,255,.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SAFE_X, HEIGHT - 128);
  ctx.lineTo(WIDTH - SAFE_X, HEIGHT - 128);
  ctx.stroke();

  setFont(ctx, 26, 700);
  ctx.fillStyle = palette.muted;
  ctx.fillText(post.handle || '@yojeumdon', SAFE_X, HEIGHT - 75);
  const page = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  const w = ctx.measureText(page).width;
  ctx.fillText(page, WIDTH - SAFE_X - w, HEIGHT - 75);
}

function normalizeCard(card, index, post) {
  if (typeof card === 'string') {
    return { type: index === 0 ? 'cover' : 'default', title: card, body: '' };
  }
  return {
    type: card.type || (index === 0 ? 'cover' : 'default'),
    tag: card.tag || post.category || '요즘돈',
    title: card.title || card.heading || post.title || post.topic || '요즘돈 카드뉴스',
    body: card.body || card.text || card.description || '',
    bullets: card.bullets || card.points || [],
    note: card.note || '',
  };
}

export function validatePost(post) {
  const errors = [];
  if (!post || typeof post !== 'object') errors.push('post JSON is not an object.');
  if (!String(post?.title || post?.topic || '').trim()) errors.push('title or topic is required.');
  if (!String(post?.caption || '').trim()) errors.push('caption is required.');
  if (!Array.isArray(post?.cards) || post.cards.length < 1) errors.push('cards array is required.');
  if (Array.isArray(post?.cards) && post.cards.length > Number(process.env.MAX_CAROUSEL_IMAGES || 10)) {
    errors.push(`cards length exceeds MAX_CAROUSEL_IMAGES (${process.env.MAX_CAROUSEL_IMAGES || 10}).`);
  }
  return errors;
}

export function renderCard(post, rawCard, index, total) {
  tryRegisterFonts();
  const card = normalizeCard(rawCard, index, post);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, card.type);
  drawTag(ctx, card.tag, card.type);

  const maxWidth = WIDTH - SAFE_X * 2;
  const titleSize = card.type === 'cover' ? 74 : 58;
  const titleY = card.type === 'cover' ? 275 : 230;
  setFont(ctx, titleSize, 950);
  ctx.fillStyle = palette.text;
  const afterTitle = drawWrapped(ctx, card.title, SAFE_X, titleY, maxWidth, titleSize * 1.18, { maxLines: 6 });

  let y = Math.max(afterTitle + 60, card.type === 'cover' ? 670 : 520);
  if (card.body) {
    setFont(ctx, card.type === 'cover' ? 38 : 34, 700);
    ctx.fillStyle = palette.muted;
    y = drawWrapped(ctx, card.body, SAFE_X, y, maxWidth, card.type === 'cover' ? 58 : 52, { maxLines: 8 }) + 26;
  }

  if (Array.isArray(card.bullets) && card.bullets.length) {
    setFont(ctx, 34, 800);
    for (const bullet of card.bullets.slice(0, 5)) {
      fillRoundRect(ctx, SAFE_X, y - 36, 16, 16, 8, card.type === 'warning' ? palette.coral : palette.accent);
      ctx.fillStyle = palette.text;
      y = drawWrapped(ctx, String(bullet), SAFE_X + 34, y, maxWidth - 34, 48, { maxLines: 2 }) + 28;
    }
  }

  if (card.note) {
    fillRoundRect(ctx, SAFE_X, HEIGHT - 300, maxWidth, 112, 28, 'rgba(255,255,255,.07)');
    setFont(ctx, 28, 800);
    ctx.fillStyle = card.type === 'warning' ? palette.coral : palette.accent;
    ctx.fillText('운영자 메모', SAFE_X + 30, HEIGHT - 257);
    setFont(ctx, 28, 700);
    ctx.fillStyle = palette.text;
    drawWrapped(ctx, card.note, SAFE_X + 30, HEIGHT - 216, maxWidth - 60, 40, { maxLines: 2 });
  }

  drawFooter(ctx, post, index, total);
  return canvas;
}

export async function renderPostToFiles(post, outputDir) {
  const errors = validatePost(post);
  if (errors.length) throw new Error(errors.join('\n'));
  await fs.mkdir(outputDir, { recursive: true });
  const files = [];
  const cards = post.cards.slice(0, Number(process.env.MAX_CAROUSEL_IMAGES || 10));
  for (let index = 0; index < cards.length; index += 1) {
    const canvas = renderCard(post, cards[index], index, cards.length);
    const buffer = await canvas.encode('png');
    const filePath = path.join(outputDir, `card_${String(index + 1).padStart(2, '0')}.png`);
    await fs.writeFile(filePath, buffer);
    files.push(filePath);
  }
  return files;
}
