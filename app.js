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
  facts: '지원금·복지 혜택은 신청주의인 경우가 많아 직접 조회가 필요합니다.\n복지로 모의계산에서 복지서비스 수급 가능성을 1차 확인할 수 있습니다.\n정부24 혜택알리미/보조금24에서 개인 맞춤형 정부·지자체 혜택을 확인할 수 있습니다.\n근로장려금처럼 소득이 있어도 조건에 따라 받을 수 있는 제도가 있습니다.',
  sources: 'https://www.bokjiro.go.kr\nhttps://www.gov.kr\nhttps://www.nts.go.kr',
  note: '이건 몰라서 못 받는 돈이라기보다, 어디서 확인해야 하는지 몰라서 놓치는 경우가 많습니다.',
  cta: '저장'
};

function lines(text) {
  return String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function esc(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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
    createdAt: new Date().toLocaleString('ko-KR')
  };
}

function fill(data) {
  $('channel').value = data.channel || '요즘돈';
  $('handle').value = data.handle || '@요즘돈';
  $('topic').value = data.topic || '';
  $('category').value = data.category || '지원금/정책';
  $('audience').value = data.audience || '2030~40 직장인·자영업자';
  $('region').value = data.region || '';
  $('facts').value = data.facts || '';
  $('sources').value = data.sources || '';
  $('note').value = data.note || '';
  $('cta').value = data.cta || '저장';
}

function makeCards(data) {
  const d = defaults[data.category] || defaults['지원금/정책'];
  const facts = data.facts.length ? data.facts.slice(0, 4).map((x) => '• ' + x).join('\n') : '• 발행 전 공식 출처에서 조건을 확인하세요.';
  const sources = data.sources.length ? data.sources.map((x) => '• ' + x).join('\n') : '• 공식 출처 링크를 입력하세요.';
  return [
    ['01', data.topic || d.hook, d.hook + '\n\n' + (data.region || data.audience), '저장해두고 따라하기'],
    ['02', '왜 놓치기 쉬울까?', '돈 되는 정보는 대부분 직접 확인하고 신청해야 합니다.\n정보가 흩어져 있으면 그냥 지나칠 수 있습니다.', ''],
    ['03', '먼저 확인할 것', '대상: ' + data.audience + '\n지역/조건: ' + (data.region || '발행 전 입력 필요'), ''],
    ['04', '확인된 핵심 사실', facts, ''],
    ['05', '1단계 · ' + d.steps[0], '공식 사이트나 공고문에서 대상 조건을 먼저 확인하세요.', ''],
    ['06', '2단계 · ' + d.steps[1], '나이, 소득, 재산, 거주지, 사업자 여부처럼 탈락 조건을 분리해서 봅니다.', ''],
    ['07', '3단계 · ' + d.steps[2], '신청 기간과 제출서류를 확인합니다. 기한 지난 정보는 저장해도 의미가 없습니다.', ''],
    ['08', '자주 놓치는 사람', '“나는 해당 안 될 거야” 하고 넘기는 사람.\n소득이 있어도 조건에 따라 받을 수 있는 제도가 있습니다.', ''],
    ['09', '한 번 더 확인할 곳', sources, ''],
    ['10', '주의할 점', '이 카드는 길잡이입니다. 실제 신청 전에는 최신 공고를 반드시 확인하세요.', '정직 라인'],
    ['11', '요즘돈 관점', data.note || '돈 정보는 많이 보는 것보다, 내 상황에 맞는 것만 골라 실행하는 게 중요합니다.', ''],
    ['12', '저장용 요약', '공식 출처 확인 → 대상 조건 확인 → 신청 기간 확인 → 서류 준비 → 신청/변경/해지 실행', ''],
    ['13', data.cta + ' 필수', '도움 됐다면 ' + data.cta + '해두세요.\n궁금한 지역/제도를 댓글로 남겨주세요.\n' + data.handle + ' 팔로우', data.channel]
  ];
}

function makeCaption(data) {
  const d = defaults[data.category] || defaults['지원금/정책'];
  const sourceBlock = data.sources.length ? '확인 출처:\n' + data.sources.map((x) => '- ' + x).join('\n') : '※ 발행 전 공식 출처 링크를 확인해 넣으세요.';
  return [data.topic, '', '바빠서 놓치기 쉬운 돈 정보를 바로 실행할 수 있게 정리했습니다.', '단, 금액·대상·신청기한은 바뀔 수 있으니 실제 신청 전에는 반드시 최신 공고를 확인하세요.', '', sourceBlock, '', '도움 됐다면 ' + data.cta + '해두고 필요한 사람에게 공유해주세요.', '', d.tags.map((x) => '#' + x).join(' ')].join('\n');
}

function makeChecklist(data) {
  return ['금액·기한·대상 조건을 공식 출처에서 다시 확인했다.', '발행일 기준 문구를 넣었다.', '무조건·누구나·확정 지급 같은 과장 표현을 삭제했다.', '출처 링크를 캡션 또는 댓글에 남길 준비가 됐다.', '카드 1장에는 후킹, 마지막 장에는 행동 유도가 있다.', '운영자 관점 한 줄이 포함됐다.', data.sources.length ? '공식 출처 링크가 입력됐다.' : '공식 출처 링크가 비어 있다.'];
}

function makeMarkdown(data, cards, caption, checklist) {
  const cardText = cards.map((c) => '## ' + c[0] + '. ' + c[1] + '\n\n' + c[2] + (c[3] ? '\n\n**' + c[3] + '**' : '')).join('\n\n---\n\n');
  return '# ' + data.topic + '\n\n- 채널: ' + data.channel + '\n- 카테고리: ' + data.category + '\n- 생성일: ' + data.createdAt + '\n\n## 카드 원고\n\n' + cardText + '\n\n---\n\n## 캡션\n\n' + caption + '\n\n---\n\n## 발행 전 체크리스트\n\n' + checklist.map((x) => '- [ ] ' + x).join('\n');
}

function renderCards(cards) {
  $('preview').innerHTML = cards.map((c) => '<article class="card"><div><div class="no">' + c[0] + '</div><h3>' + esc(c[1]) + '</h3><p>' + esc(c[2]) + '</p></div>' + (c[3] ? '<div class="kicker">' + esc(c[3]) + '</div>' : '') + '</article>').join('');
}

function generate() {
  const data = getData();
  if (!data.topic) {
    $('status').className = 'status warn';
    $('status').textContent = '주제를 입력해야 합니다.';
    return;
  }
  const cards = makeCards(data);
  const caption = makeCaption(data);
  const checklist = makeChecklist(data);
  renderCards(cards);
  $('markdown').value = makeMarkdown(data, cards, caption, checklist);
  $('checklist').innerHTML = checklist.map((x) => '<div>□ ' + esc(x) + '</div>').join('');
  $('status').className = data.sources.length ? 'status ok' : 'status warn';
  $('status').textContent = data.sources.length ? '생성 완료. 최신 조건만 마지막 확인하세요.' : '생성 완료. 공식 출처 링크를 보강해야 합니다.';
}

$('generateBtn').onclick = generate;
$('sampleBtn').onclick = () => { fill(sample); generate(); };
$('resetBtn').onclick = () => { fill({}); $('preview').innerHTML = ''; $('markdown').value = ''; $('checklist').innerHTML = ''; $('status').className = 'status'; $('status').textContent = '초기화했습니다.'; };
$('copyBtn').onclick = () => { $('markdown').select(); document.execCommand('copy'); $('status').className = 'status ok'; $('status').textContent = 'Markdown 원고를 복사했습니다.'; };
$('mdBtn').onclick = () => { alert('Markdown 영역을 복사해서 .md 파일로 저장하세요.'); };
$('jsonBtn').onclick = () => { alert('현재 버전은 Markdown 원고 중심입니다. JSON 내보내기는 다음 버전에서 확장하세요.'); };
