const OWNER = 'apark12321-ux';
const REPO = 'cardnews';
const BRANCH = 'main';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const GH = `https://github.com/${OWNER}/${REPO}`;

const $ = (selector) => document.querySelector(selector);

const requiredFiles = [
  { path: 'index.html', label: 'Vercel 정적 생성기', phase: 'generator' },
  { path: 'posts', label: '발행 큐 폴더', phase: 'queue' },
  { path: 'src/render.mjs', label: '헤드리스 카드 PNG 렌더러', phase: 'render' },
  { path: 'src/cloudinary.mjs', label: 'Cloudinary 업로드 모듈', phase: 'upload' },
  { path: 'src/instagramPublisher.mjs', label: 'Instagram Graph API 게시 모듈', phase: 'publish' },
  { path: 'scripts/auto-publish.mjs', label: '큐 선택→렌더→업로드→게시 오케스트레이터', phase: 'orchestrator' },
  { path: '.github/workflows/auto-publish.yml', label: '예약 자동 발행 워크플로우', phase: 'schedule' },
  { path: '.github/workflows/instagram-publish.yml', label: '수동 인스타 게시 워크플로우', phase: 'manual' },
  { path: 'vercel.json', label: 'Vercel 정적 배포 설정', phase: 'vercel' },
];

const nodes = [
  { key: 'generator', title: '정적 생성기', desc: '주제·문구를 입력하고 발행 큐 JSON을 만드는 화면' },
  { key: 'queue', title: '발행 큐', desc: 'posts 폴더에서 status=queued 글을 대기열로 관리' },
  { key: 'render', title: 'PNG 렌더', desc: 'GitHub Actions 안에서 카드 이미지를 자동 생성' },
  { key: 'upload', title: 'Cloudinary 업로드', desc: '인스타가 접근 가능한 공개 이미지 URL 생성' },
  { key: 'publish', title: 'Instagram 게시', desc: 'Graph API로 캐러셀 컨테이너 생성 후 발행' },
  { key: 'schedule', title: '예약/완료 처리', desc: '정해진 시간 실행 후 published 상태로 기록' },
];

function badge(status, text) {
  return `<span class="badge ${status}">${text}</span>`;
}

function nodeStatusClass(status) {
  if (status === 'done') return 'ok';
  if (status === 'running') return 'run';
  if (status === 'warning') return 'warn';
  if (status === 'failed') return 'bad';
  return '';
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

async function exists(path) {
  try {
    await getJSON(`${API}/contents/${path}?ref=${BRANCH}`);
    return true;
  } catch (_) {
    return false;
  }
}

async function loadPosts() {
  try {
    const entries = await getJSON(`${API}/contents/posts?ref=${BRANCH}`);
    const jsonFiles = Array.isArray(entries) ? entries.filter((file) => file.name.endsWith('.json')) : [];
    const posts = await Promise.all(jsonFiles.map(async (file) => {
      try {
        const data = await getJSON(file.download_url);
        return { file: file.name, path: file.path, html_url: file.html_url, ...data };
      } catch (error) {
        return { file: file.name, path: file.path, html_url: file.html_url, status: 'invalid', error: error.message };
      }
    }));
    return posts.sort((a, b) => a.file.localeCompare(b.file));
  } catch (_) {
    return [];
  }
}

async function loadWorkflowText(path) {
  try {
    return await getText(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`);
  } catch (_) {
    return '';
  }
}

function detectSchedule(workflowTexts) {
  const found = workflowTexts.find((item) => /schedule\s*:/i.test(item.text) || /cron\s*:/i.test(item.text));
  if (!found) return { hasSchedule: false, detail: '예약 cron 없음' };
  const cronLine = found.text.split('\n').find((line) => line.includes('cron:'))?.trim() || 'schedule 있음';
  return { hasSchedule: true, detail: `${found.path} · ${cronLine.replace(/^[-\s]*/, '')}` };
}

function getLatestRun(runs) {
  if (!runs?.workflow_runs?.length) return null;
  return runs.workflow_runs[0];
}

function renderPipeline({ fileChecks, posts, latestRun, schedule }) {
  const fileMap = Object.fromEntries(fileChecks.map((item) => [item.phase, item.ok]));
  const queued = posts.filter((post) => (post.status || '').toLowerCase() === 'queued').length;
  const published = posts.filter((post) => (post.status || '').toLowerCase() === 'published').length;

  const states = {
    generator: fileMap.generator ? 'done' : 'failed',
    queue: queued > 0 ? 'done' : (posts.length > 0 ? 'warning' : 'failed'),
    render: fileMap.render ? 'done' : 'warning',
    upload: fileMap.upload ? 'done' : 'warning',
    publish: fileMap.publish ? 'done' : 'warning',
    schedule: schedule.hasSchedule ? 'done' : 'warning',
  };

  if (latestRun?.status === 'in_progress' || latestRun?.status === 'queued') {
    states.schedule = 'running';
  }
  if (latestRun?.status === 'completed' && latestRun?.conclusion === 'failure') {
    states.publish = 'failed';
  }
  if (latestRun?.status === 'completed' && latestRun?.conclusion === 'success') {
    states.render = fileMap.render ? 'done' : states.render;
    states.upload = fileMap.upload ? 'done' : states.upload;
    states.publish = 'done';
  }

  $('#pipeline').innerHTML = nodes.map((node, index) => {
    const state = states[node.key] || 'idle';
    const label = state === 'done' ? '완료'
      : state === 'running' ? '실행 중'
      : state === 'failed' ? '오류'
      : state === 'warning' ? '보완 필요'
      : '대기';
    return `
      <article class="node ${nodeStatusClass(state)}">
        <span class="step">STEP ${String(index + 1).padStart(2, '0')}</span>
        <h3><span class="status-dot"></span>${node.title}</h3>
        <p>${node.desc}</p>
        <p style="margin-top:12px">${badge(nodeStatusClass(state), label)}</p>
      </article>
    `;
  }).join('');

  $('#queuedCount').textContent = queued;
  $('#publishedCount').textContent = published;
}

function renderQueue(posts) {
  const target = $('#queueList');
  if (!posts.length) {
    target.innerHTML = '<div class="item"><strong>posts 폴더에 JSON이 없습니다.</strong><p>생성기에서 발행 큐 JSON을 내려받아 posts/에 커밋하면 여기에 표시됩니다.</p></div>';
    return;
  }

  target.innerHTML = posts.map((post) => {
    const status = (post.status || 'unknown').toLowerCase();
    const statusClass = status === 'queued' ? 'warn' : status === 'published' ? 'ok' : status === 'invalid' ? 'bad' : '';
    const title = post.title || post.topic || post.caption?.slice(0, 36) || post.file;
    const cardCount = Array.isArray(post.cards) ? post.cards.length : Array.isArray(post.imageUrls) ? post.imageUrls.length : 0;
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <strong>${title}</strong>
            <small>${post.file} · 카드/이미지 ${cardCount}개</small>
          </div>
          ${badge(statusClass, status)}
        </div>
        ${post.error ? `<p style="margin-top:8px;color:#fecdd3">${post.error}</p>` : ''}
      </div>
    `;
  }).join('');
}

function renderRuns(runs) {
  const target = $('#runsList');
  const list = runs?.workflow_runs || [];
  if (!list.length) {
    target.innerHTML = '<div class="item"><strong>아직 실행 기록이 없습니다.</strong><p>Actions에서 워크플로우를 한 번 실행하면 여기에 표시됩니다.</p></div>';
    return;
  }
  target.innerHTML = list.slice(0, 6).map((run) => {
    const cls = run.status === 'completed'
      ? (run.conclusion === 'success' ? 'ok' : 'bad')
      : 'run';
    const text = run.status === 'completed' ? run.conclusion : run.status;
    return `
      <a class="item" href="${run.html_url}" target="_blank" rel="noreferrer" style="text-decoration:none">
        <div class="item-top">
          <div>
            <strong>${run.name}</strong>
            <small>${formatDate(run.created_at)} · ${run.event}</small>
          </div>
          ${badge(cls, text)}
        </div>
      </a>
    `;
  }).join('');
}

function renderChecklist(fileChecks, schedule) {
  const checklist = [...fileChecks];
  checklist.push({ label: '예약 cron 설정', path: schedule.detail, ok: schedule.hasSchedule });

  $('#checklist').innerHTML = checklist.map((item) => `
    <div class="item">
      <div class="item-top">
        <div>
          <strong>${item.label}</strong>
          <small>${item.path}</small>
        </div>
        ${badge(item.ok ? 'ok' : 'warn', item.ok ? '확인됨' : '보완 필요')}
      </div>
    </div>
  `).join('');
}

function renderLatest(latestRun, schedule) {
  if (!latestRun) {
    $('#latestRunStatus').textContent = '기록 없음';
    $('#latestRunTime').textContent = '아직 Actions 실행 없음';
  } else {
    $('#latestRunStatus').textContent = latestRun.status === 'completed' ? latestRun.conclusion : latestRun.status;
    $('#latestRunTime').textContent = formatDate(latestRun.created_at);
  }
  $('#scheduleStatus').textContent = schedule.hasSchedule ? '예약 있음' : '예약 없음';
  $('#scheduleDetail').textContent = schedule.detail;
}

async function refresh() {
  $('#refreshBtn').disabled = true;
  $('#refreshBtn').textContent = '확인 중...';
  $('#lastChecked').textContent = '업데이트 중';

  try {
    $('#actionsLink').href = `${GH}/actions`;
    $('#postsLink').href = `${GH}/tree/${BRANCH}/posts`;
    $('#workflowLink').href = `${GH}/actions`;

    const [posts, runs, workflows, fileChecks] = await Promise.all([
      loadPosts(),
      getJSON(`${API}/actions/runs?per_page=12`).catch(() => ({ workflow_runs: [] })),
      getJSON(`${API}/actions/workflows`).catch(() => ({ workflows: [] })),
      Promise.all(requiredFiles.map(async (item) => ({ ...item, ok: await exists(item.path) }))),
    ]);

    const workflowTexts = await Promise.all((workflows.workflows || []).map(async (wf) => ({
      path: wf.path,
      text: await loadWorkflowText(wf.path),
    })));
    const schedule = detectSchedule(workflowTexts);
    const latestRun = getLatestRun(runs);

    renderPipeline({ fileChecks, posts, latestRun, schedule });
    renderQueue(posts);
    renderRuns(runs);
    renderChecklist(fileChecks, schedule);
    renderLatest(latestRun, schedule);

    $('#lastChecked').textContent = `마지막 확인 ${formatDate(new Date().toISOString())}`;
  } catch (error) {
    $('#pipeline').innerHTML = `<div class="error-box">상태를 불러오지 못했습니다.<br>${error.message}</div>`;
    $('#lastChecked').textContent = '확인 실패';
  } finally {
    $('#refreshBtn').disabled = false;
    $('#refreshBtn').textContent = '새로고침';
  }
}

$('#refreshBtn').addEventListener('click', refresh);
refresh();
setInterval(refresh, 60_000);
