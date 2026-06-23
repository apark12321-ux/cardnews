const $ = (id) => document.getElementById(id);

const defaults = {
  '지원금/정책': {
    hook: '안 받으면 손해일 수 있습니다',
    tags: ['정부지원금','지원금','복지로','정부24','생활경제','재테크','절약','요즘돈'],
    steps: ['공식 사이트에서 대상 확인','소득·연령·지역 조건 확인','신청 기간과 제출서류 확인']
  },
  '절약/고정비': {
    hook: '이번 달 새는 돈부터 막으세요',
    tags: ['절약','고정비절약','생활비절약','통신비절약','구독관리','생활경제','재테크','요즘돈'],
    steps: ['최근 3개월 명세서 확인','반복 결제 항목 정리','해지·변경 가능한 항목부터 실행']
  },
  '카드/포인트': {
    hook: '잠자는 포인트부터 확인하세요',
    tags: ['카드포인트','포인트현금화','카드혜택','마일리지','생활경제','재테크','절약','요즘돈'],
    steps: ['카드사 앱에서 보유 포인트 확인','소멸 예정 포인트 확인','현금화·결제 차감 가능 여부 확인']
  },
  '소비 트렌드': {
    hook: '요즘 소비 흐름, 돈으로 연결해서 봅니다',
    tags: ['소비트렌드','돈되는정보','생활경제','재테크','절약','요즘돈'],
    steps: ['트렌드 현상 확인','내 지출과 연결','바꿀 행동 하나 정하기']
  },
  '전월세/청약': {
    hook: '계약 전 이건 꼭 확인하세요',
    tags: ['전월세','부동산기초','계약체크리스트','생활경제','요즘돈'],
    steps: ['등기부등본 확인','보증금 보호 조건 확인','계약 전 특약 확인']
  },
  '이번 주 트렌드 3': {
    hook: '이번 주 챙길 돈 정보 3개',
    tags: ['돈되는정보','경제트렌드','생활경제','재테크','절약','정책정보','직장인재테크','요즘돈'],
    steps: ['이번 주 이슈 3개 선정','내게 해당되는지 확인','저장할 행동만 정리']
  }
};

const sample = {
  channel: '요즘돈',
  handle: '@요즘돈',
  topic: '내가 받을 수 있는 지원금 5분 만에 찾는 법',
  category: '지원금/정책',
  audience: '2030~40 직장인·자영업자',
  region: '전국 / 청년 / 아이 있는 가구 / 근로자',
  facts: '지원금·복지 혜택은 신청주의인 경우가 많아 직접 조회가 필요합니다.\n복지로 모의계산에서 복지서비스 수급 가능성을 1차 확인할 수 있습니다.\n정부24 보조금24에서 개인 맞춤형 정부·지자체 혜택을 확인할 수 있습니다.\n근로장려금처럼 소득이 있어도 조건에 따라 받을 수 있는 제도가 있습니다.',
  sources: 'https://www.bokjiro.go.kr\nhttps://www.gov.kr\nhttps://www.nts.go.kr',
  note: '이건 몰라서 못 받는 돈이라기보다, 어디서 확인해야 하는지 몰라서 놓치는 경우가 많습니다.',
  cta: '저장'
};

let currentPost = null;
let currentMarkdown = '';

function lines(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function esc(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function slugify(text) {
  const base = String(text || 'yojeumdon')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'yojeumdon';
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getData() {
  return {
    channel: $('channel').value.trim() || '요즘돈',
    handle: $('handle').value.trim() || '@요즘돈',
    topic: $('topic').value.trim(),
    category: $('category').value,
    audience: $('audience').value.trim(),
    region: $('region').value.trim(),
    facts: lines($('facts').value),
    sources: lines($('sources').value),
    note: $('note').value.trim(),
    cta: $('cta').value,
    createdAt: new Date().toISOString()
  };
}

function fill(data) {
  $('channel').value = data.channel || '요즘돈';
  $('handle').value = data.handle || '@요즘돈';
  $('topic').value = data.topic || '';
  $('category').value = data.category || '지원금/정책';
  $('audience').value = data.audience || '2030~40 직장인·자영업자';
  $('region').value = data.region || '';
  $('facts').value = Array.isArray(data.facts) ? data.facts.join('\n') : (data.facts || '');
  $('sources').value = Array.isArray(data.sources) ? data.sources.join('\n') : (data.sources || '');
  $('note').value = data.note || '';
  $('cta').value = data.cta || '저장';
}

function makeCards(data) {
  const d = defaults[data.category] || defaults['지원금/정책'];
  const facts = data.facts.length ? data.facts.slice(0, 4) : ['발행 전 공식 출처에서 조건을 확인하세요.'];
  const sources = data.sources.length ? data.sources.slice(0, 4) : ['공식 출처 링크를 입력하세요.'];

  return [
    { type: 'cover', tag: data.category, title: data.topic || d.hook, body: `${d.hook}\n\n${data.region || data.audience}`, note: '저장해두고 따라하기' },
    { tag: data.category, title: '왜 놓치기 쉬울까?', body: '돈 되는 정보는 대부분 직접 확인하고 신청해야 합니다.\n정보가 흩어져 있으면 그냥 지나칠 수 있습니다.' },
    { tag: data.category, title: '먼저 확인할 것', bullets: [`대상: ${data.audience}`, `지역/조건: ${data.region || '발행 전 입력 필요'}`] },
    { tag: data.category, title: '확인된 핵심 사실', bullets: facts },
    { tag: data.category, title: `1단계 · ${d.steps[0]}`, body: '공식 사이트나 공고문에서 대상 조건을 먼저 확인하세요.' },
    { tag: data.category, title: `2단계 · ${d.steps[1]}`, body: '나이, 소득, 재산, 거주지, 사업자 여부처럼 탈락 조건을 분리해서 봅니다.' },
    { tag: data.category, title: `3단계 · ${d.steps[2]}`, body: '신청 기간과 제출서류를 확인합니다. 기한 지난 정보는 저장해도 의미가 없습니다.' },
    { tag: data.category, title: '자주 놓치는 사람', body: '“나는 해당 안 될 거야” 하고 넘기는 사람.\n소득이 있어도 조건에 따라 받을 수 있는 제도가 있습니다.' },
    { tag: data.category, title: '한 번 더 확인할 곳', bullets: sources },
    { type: 'warning', tag: '정직 라인', title: '주의할 점', body: '이 카드는 길잡이입니다. 실제 신청 전에는 최신 공고를 반드시 확인하세요.' },
    { tag: data.category, title: '요즘돈 관점', body: data.note || '돈 정보는 많이 보는 것보다, 내 상황에 맞는 것만 골라 실행하는 게 중요합니다.' },
    { tag: data.category, title: '저장용 요약', bullets: ['공식 출처 확인', '대상 조건 확인', '신청 기간 확인', '서류 준비', '신청/변경/해지 실행'] },
    { type: 'cta', tag: data.channel, title: `${data.cta} 필수`, body: `도움 됐다면 ${data.cta}해두세요.\n궁금한 지역/제도를 댓글로 남겨주세요.\n${data.handle} 팔로우` }
  ];
}

function makeCaption(data) {
  const d = defaults[data.category] || defaults['지원금/정책'];
  const sourceBlock = data.sources.length
    ? '확인 출처:\n' + data.sources.map((x) => '- ' + x).join('\n')
    : '※ 발행 전 공식 출처 링크를 확인해 넣으세요.';
  return [
    data.topic,
    '',
    '바빠서 놓치기 쉬운 돈 정보를 바로 실행할 수 있게 정리했습니다.',
    '단, 금액·대상·신청기한은 바뀔 수 있으니 실제 신청 전에는 반드시 최신 공고를 확인하세요.',
    '',
    sourceBlock,
    '',
    `도움 됐다면 ${data.cta}해두고 필요한 사람에게 공유해주세요.`,
    '',
    d.tags.map((x) => '#' + x).join(' ')
  ].join('\n');
}

function makeChecklist(data) {
  return [
    '금액·기한·대상 조건을 공식 출처에서 다시 확인했다.',
    '발행일 기준 문구를 넣었다.',
    '무조건·누구나·확정 지급 같은 과장 표현을 삭제했다.',
    '출처 링크를 캡션 또는 댓글에 남길 준비가 됐다.',
    '카드 1장에는 후킹, 마지막 장에는 행동 유도가 있다.',
    '운영자 관점 한 줄이 포함됐다.',
    data.sources.length ? '공식 출처 링크가 입력됐다.' : '공식 출처 링크가 비어 있다.'
  ];
}

function makePost(data, cards, caption, checklist) {
  return {
    schemaVersion: 2,
    status: 'queued',
    title: data.topic,
    slug: `${nowStamp()}-${slugify(data.topic)}`,
    channel: data.channel,
    handle: data.handle,
    category: data.category,
    audience: data.audience,
    region: data.region,
    facts: data.facts,
    sources: data.sources,
    operatorNote: data.note,
    caption,
    cards,
    checklist,
    createdAt: data.createdAt,
    queuedAt: null,
    publishedAt: null,
    cloudinaryUrls: [],
    instagram: null
  };
}

function makeMarkdown(data, cards, caption, checklist) {
  const cardText = cards.map((c, i) => {
    const body = c.body || (Array.isArray(c.bullets) ? c.bullets.map((x) => '- ' + x).join('\n') : '');
    return `## ${String(i + 1).padStart(2, '0')}. ${c.title}\n\n${body}${c.note ? `\n\n**${c.note}**` : ''}`;
  }).join('\n\n---\n\n');

  return `# ${data.topic}\n\n- 채널: ${data.channel}\n- 카테고리: ${data.category}\n- 생성일: ${new Date(data.createdAt).toLocaleString('ko-KR')}\n\n## 카드 원고\n\n${cardText}\n\n---\n\n## 캡션\n\n${caption}\n\n---\n\n## 발행 전 체크리스트\n\n${checklist.map((x) => '- [ ] ' + x).join('\n')}`;
}

function renderCards(cards) {
  $('preview').innerHTML = cards.map((c, index) => {
    const body = c.body || (Array.isArray(c.bullets) ? c.bullets.map((x) => '• ' + x).join('\n') : '');
    return `<article class="card ${c.type || ''}"><div><div class="no">${String(index + 1).padStart(2, '0')}</div><h3>${esc(c.title)}</h3><p>${esc(body)}</p></div>${c.note ? `<div class="kicker">${esc(c.note)}</div>` : ''}</article>`;
  }).join('');
}

function setStatus(message, type = '') {
  $('status').className = type ? `status ${type}` : 'status';
  $('status').textContent = message;
}

function generate() {
  const data = getData();
  if (!data.topic) {
    setStatus('주제를 입력해야 합니다.', 'warn');
    return null;
  }

  const cards = makeCards(data);
  const caption = makeCaption(data);
  const checklist = makeChecklist(data);
  const post = makePost(data, cards, caption, checklist);
  currentPost = post;
  currentMarkdown = makeMarkdown(data, cards, caption, checklist);

  renderCards(cards);
  $('markdown').value = currentMarkdown;
  $('jsonOutput').value = JSON.stringify(post, null, 2);
  $('checklist').innerHTML = checklist.map((x) => `<div>□ ${esc(x)}</div>`).join('');
  setStatus(data.sources.length ? '생성 완료. 이제 발행 큐에 등록할 수 있습니다.' : '생성 완료. 공식 출처 링크를 보강한 뒤 큐에 등록하세요.', data.sources.length ? 'ok' : 'warn');
  return post;
}

function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function queuePost() {
  const post = currentPost || generate();
  if (!post) return;

  $('queueBtn').disabled = true;
  setStatus('발행 큐에 등록 중입니다. GitHub posts/ 폴더에 직접 저장합니다...', '');

  try {
    const response = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    currentPost.queuedAt = result.queuedAt;
    currentPost.githubPath = result.path;
    $('jsonOutput').value = JSON.stringify(currentPost, null, 2);
    setStatus(`발행 큐 등록 완료: ${result.path}. 이제 예약 시간이 되면 자동 게시됩니다.`, 'ok');
  } catch (error) {
    setStatus(`큐 등록 실패: ${error.message}. Vercel 환경변수 GITHUB_QUEUE_TOKEN을 확인하세요.`, 'warn');
  } finally {
    $('queueBtn').disabled = false;
  }
}

$('generateBtn').onclick = generate;
$('sampleBtn').onclick = () => { fill(sample); generate(); };
$('resetBtn').onclick = () => {
  currentPost = null;
  currentMarkdown = '';
  fill({});
  $('preview').innerHTML = '';
  $('markdown').value = '';
  $('jsonOutput').value = '';
  $('checklist').innerHTML = '';
  setStatus('초기화했습니다.');
};
$('copyBtn').onclick = () => {
  if (!currentMarkdown) generate();
  $('markdown').select();
  document.execCommand('copy');
  setStatus('Markdown 원고를 복사했습니다.', 'ok');
};
$('jsonBtn').onclick = () => {
  const post = currentPost || generate();
  if (!post) return;
  download(`${post.slug}.json`, JSON.stringify(post, null, 2));
  setStatus('발행 큐 JSON을 다운로드했습니다.', 'ok');
};
$('queueBtn').onclick = queuePost;
