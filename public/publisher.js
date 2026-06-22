const $ = (id) => document.getElementById(id);

const sample = {
  channel: '요즘돈',
  handle: '@요즘돈',
  topic: '내가 받을 수 있는 지원금 5분 만에 찾는 법',
  target: '전국 / 청년 / 아이 있는 가구 / 근로자',
  facts: '지원금·복지 혜택은 신청주의인 경우가 많아 직접 조회가 필요합니다.\n복지로 모의계산에서 복지서비스 수급 가능성을 1차 확인할 수 있습니다.\n정부24 혜택알리미/보조금24에서 개인 맞춤형 정부·지자체 혜택을 확인할 수 있습니다.\n근로장려금처럼 소득이 있어도 조건에 따라 받을 수 있는 제도가 있습니다.',
  sources: 'https://www.bokjiro.go.kr\nhttps://www.gov.kr\nhttps://www.nts.go.kr',
  note: '이건 몰라서 못 받는 돈이라기보다, 어디서 확인해야 하는지 몰라서 놓치는 경우가 많습니다.',
  cta: '저장'
};

let currentCards = [];
let renderedCards = [];
let currentCaption = '';

function lines(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function esc(text) {
  return String(text || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function getData() {
  return {
    channel: $('channel').value.trim() || '요즘돈',
    handle: $('handle').value.trim() || '@요즘돈',
    topic: $('topic').value.trim(),
    target: $('target').value.trim(),
    facts: lines($('facts').value),
    sources: lines($('sources').value),
    note: $('note').value.trim(),
    cta: $('cta').value
  };
}

function fill(data) {
  $('channel').value = data.channel || '요즘돈';
  $('handle').value = data.handle || '@요즘돈';
  $('topic').value = data.topic || '';
  $('target').value = data.target || '';
  $('facts').value = data.facts || '';
  $('sources').value = data.sources || '';
  $('note').value = data.note || '';
  $('cta').value = data.cta || '저장';
}

function makeCards(data) {
  const facts = data.facts.length ? data.facts.slice(0, 3).map((x) => '• ' + x).join('\n') : '• 발행 전 공식 출처에서 조건을 확인하세요.';
  const sources = data.sources.length ? data.sources.slice(0, 3).map((x) => '• ' + x.replace(/^https?:\/\//, '')).join('\n') : '• 공식 출처 링크를 입력하세요.';
  return [
    { no: '01', title: data.topic || '돈 되는 정보 정리', body: '저장해두고 그대로 따라하기\n' + (data.target || '대상 조건 확인 필요'), kicker: data.channel },
    { no: '02', title: '왜 놓칠까?', body: '돈 되는 혜택은 대부분 직접 확인하고 신청해야 합니다.\n정보가 흩어져 있으면 그냥 지나치기 쉽습니다.', kicker: '' },
    { no: '03', title: '먼저 볼 조건', body: '대상/지역\n' + (data.target || '발행 전 입력 필요'), kicker: '내 조건부터 확인' },
    { no: '04', title: '확인된 사실', body: facts, kicker: '공식 출처 기준' },
    { no: '05', title: '1단계', body: '공식 사이트나 공고문에서 대상 조건을 먼저 확인하세요.\n블로그 요약보다 원문이 우선입니다.', kicker: '출처 확인' },
    { no: '06', title: '2단계', body: '나이·소득·재산·거주지·사업자 여부처럼 탈락 조건을 따로 봅니다.', kicker: '조건 분리' },
    { no: '07', title: '3단계', body: '신청 기간과 제출서류를 확인합니다.\n기한 지난 정보는 저장해도 의미가 없습니다.', kicker: '기한 확인' },
    { no: '08', title: '자주 하는 오해', body: '“나는 해당 안 될 거야” 하고 넘기지 마세요.\n소득이 있어도 받을 수 있는 제도가 있습니다.', kicker: '' },
    { no: '09', title: '확인 출처', body: sources, kicker: '발행 전 재확인' },
    { no: '10', title: data.cta + ' 필수', body: (data.note || '돈 정보는 많이 보는 것보다 내 상황에 맞는 것만 골라 실행하는 게 중요합니다.') + '\n\n도움 됐다면 ' + data.cta + '해두세요.\n' + data.handle + ' 팔로우', kicker: '요즘돈 관점' }
  ];
}

function makeCaption(data) {
  const sourceBlock = data.sources.length ? '확인 출처:\n' + data.sources.map((x) => '- ' + x).join('\n') : '※ 발행 전 공식 출처 링크를 확인해 넣으세요.';
  return [
    data.topic,
    '',
    '바빠서 놓치기 쉬운 돈 정보를 바로 실행할 수 있게 정리했습니다.',
    '금액·대상·신청기한은 바뀔 수 있으니 실제 신청 전에는 반드시 최신 공고를 확인하세요.',
    '',
    sourceBlock,
    '',
    '도움 됐다면 ' + data.cta + '해두고 필요한 사람에게 공유해주세요.',
    '',
    '#요즘돈 #생활경제 #재테크 #절약 #지원금 #정부지원금 #돈되는정보 #정책정보 #직장인재테크 #인스타카드뉴스'
  ].join('\n');
}

function renderPreview(cards) {
  $('cards').innerHTML = cards.map((card) => `
    <article class="card">
      <div class="card-no">${esc(card.no)}</div>
      <h3>${esc(card.title)}</h3>
      <p>${esc(card.body)}</p>
      <b>${esc(card.kicker)}</b>
    </article>
  `).join('');
}

function setStatus(message, type = '') {
  $('status').className = 'status' + (type ? ' ' + type : '');
  $('status').textContent = message;
}

function wrapText(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split('\n');
  const output = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        output.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    output.push(line);
  }
  return output;
}

function drawWrapped(ctx, text, x, y, maxWidth, lineHeight) {
  const wrapped = wrapText(ctx, text, maxWidth);
  for (const line of wrapped) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawCardToCanvas(card, index) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = index % 2 === 0 ? '#101828' : '#172033';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f5b82e';
  ctx.font = '900 46px Arial, sans-serif';
  ctx.fillText(card.no, 76, 115);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px Arial, sans-serif';
  drawWrapped(ctx, card.title, 76, 270, 900, 104);

  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '500 44px Arial, sans-serif';
  drawWrapped(ctx, card.body, 76, 700, 900, 64);

  ctx.fillStyle = '#f5b82e';
  ctx.font = '900 38px Arial, sans-serif';
  ctx.fillText(card.kicker || '요즘돈', 76, 1245);

  return canvas.toDataURL('image/png');
}

function generate() {
  const data = getData();
  if (!data.topic) return setStatus('주제를 입력해야 합니다.', 'warn');
  currentCards = makeCards(data);
  currentCaption = makeCaption(data);
  renderedCards = [];
  renderPreview(currentCards);
  $('caption').value = currentCaption;
  setStatus('10장 캐러셀 원고 생성 완료. 자동 등록 전 PNG 렌더링을 누르세요.', data.sources.length ? 'ok' : 'warn');
}

function renderPngs() {
  if (!currentCards.length) generate();
  renderedCards = currentCards.map((card, index) => ({
    fileName: `yojeumdon-${card.no}.png`,
    dataUrl: drawCardToCanvas(card, index)
  }));
  setStatus('PNG 렌더링 완료. 드라이런 검증 후 자동 등록할 수 있습니다.', 'ok');
}

async function requestPublish(dryRun) {
  if (!renderedCards.length) renderPngs();
  const caption = $('caption').value.trim();
  if (!caption) return setStatus('캡션이 필요합니다.', 'warn');

  setStatus(dryRun ? '드라이런 검증 중입니다.' : '인스타 자동 등록 중입니다. 창을 닫지 마세요.', 'warn');
  const response = await fetch('/api/publish/carousel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards: renderedCards, caption, dryRun })
  });
  const result = await response.json();
  $('log').textContent = JSON.stringify(result, null, 2);

  if (!response.ok || !result.ok) {
    setStatus(result.error || '요청에 실패했습니다.', 'warn');
    return;
  }
  setStatus(dryRun ? '드라이런 성공. 이미지 업로드와 게시 payload 확인 완료.' : '인스타 자동 등록 완료. mediaId: ' + result.mediaId, 'ok');
}

async function checkServer() {
  try {
    const response = await fetch('/api/health');
    const result = await response.json();
    const ok = result.hasInstagramConfig && result.hasCloudinaryConfig;
    $('serverStatus').className = 'pill ' + (ok ? 'ok' : 'warn');
    $('serverStatus').textContent = ok ? '등록 설정 완료' : '환경변수 확인 필요';
    $('log').textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    $('serverStatus').className = 'pill warn';
    $('serverStatus').textContent = '서버 미실행';
  }
}

$('sampleBtn').onclick = () => { fill(sample); generate(); };
$('generateBtn').onclick = generate;
$('renderBtn').onclick = renderPngs;
$('dryRunBtn').onclick = () => requestPublish(true);
$('publishBtn').onclick = () => {
  const ok = confirm('실제 인스타그램 계정에 캐러셀을 등록합니다. 계속할까요?');
  if (ok) requestPublish(false);
};

checkServer();
