#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'Extra');
const outputDir = path.join(root, 'fictions');
const soffice = process.env.SOFFICE || '/Users/nordenbox/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice';

const works = [
  {
    source: 'A Kill From Heaven.docx',
    slug: 'a-kill-from-heaven',
    title: 'A Kill From Heaven',
    description: '电影剧本。一个小镇、一次秘密行动，以及逐渐逼近的危险。',
    format: 'office',
  },
  {
    source: 'The Conjure.fadein',
    slug: 'conjuring',
    title: 'The Conjure',
    description: 'A screenplay set around a mental magician, a mysterious seaside estate, and a hidden crime.',
    format: 'fadein',
    hideDescription: true,
  },
  {
    source: 'NewRepublic_修订版.docx',
    slug: 'new-republic',
    title: 'New Republic',
    description: '一部从 2041 年的海上航行展开的长篇文学作品，写希望、混乱与虚荣。',
    format: 'office',
    startAt: '序章',
    chapters: true,
    chapterPattern: /^(序章|第[零〇一二两三四五六七八九十]+章)$/,
  },
  {
    source: '三国心事.docx',
    slug: 'three-kingdoms-reflections',
    title: '三国心事',
    description: '从历史人物的内心出发，重新凝视乱世、权力、爱情与自我。',
    format: 'office',
  },
  {
    source: '未定名之红楼梦作品.docx',
    slug: 'untitled-dream-of-the-red-chamber',
    title: '未定名之红楼梦作品',
    description: '以惜春等人物为中心，延伸红楼梦之后的故事。',
    format: 'office',
  },
  {
    source: '中央饭店2.0.rtf',
    slug: 'central-hotel',
    title: '中央饭店',
    description: '电影剧本。北京，2016 年冬天，一座高级妇产医院和一间中央饭店。',
    format: 'rtf',
    startAt: '黑底，浮现字幕，片名：',
  },
  {
    source: 'ShameV4.fadein',
    slug: 'shame',
    title: 'Shame',
    description: 'A screenplay about a girl, memory, and the private violence hidden inside an ordinary home.',
    format: 'fadein',
  },
  {
    source: '战警之无悔.fadein',
    slug: 'police-no-regrets',
    title: '战警之无悔',
    description: '一部以特警行动为背景的电影剧本。',
    format: 'fadein',
  },
  {
    source: '红尘.fadein',
    slug: 'red-dust',
    title: '红尘',
    description: '一部从火车站和河南小城展开的电影剧本。',
    format: 'fadein',
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeText(text) {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/\u000c/g, '')
    .replace(/\u00a0/g, ' ');
}

function readOfficeText(filePath) {
  return normalizeText(execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  }));
}

function readRtfText(filePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nordenbox-central-hotel-'));
  try {
    execFileSync(soffice, ['--headless', '--convert-to', 'txt:Text', '--outdir', tempDir, filePath], {
      stdio: 'ignore',
      timeout: 60_000,
    });
    const outputPath = path.join(tempDir, `${path.basename(filePath, '.rtf')}.txt`);
    return normalizeText(fs.readFileSync(outputPath, 'utf8'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function classifyFadeinStyle(style) {
  const value = style.toLowerCase();
  if (value.includes('scene heading')) return 'screenplay-scene';
  if (value.includes('character')) return 'screenplay-character';
  if (value.includes('parenthetical')) return 'screenplay-parenthetical';
  if (value.includes('dialogue')) return 'screenplay-dialogue';
  if (value.includes('transition')) return 'screenplay-transition';
  return 'screenplay-action';
}

function parsePlainText(text, startAt, skipLeading = []) {
  const lines = text.split('\n');
  const blocks = [];
  let pendingBlankLines = 0;
  let started = !startAt;
  const skipped = new Set(skipLeading);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!started) {
      if (line === startAt) started = true;
      else continue;
    }

    if (!line) {
      if (blocks.length) pendingBlankLines += 1;
      continue;
    }

    if (!blocks.length && skipped.has(line)) continue;

    blocks.push({
      text: line,
      kind: 'plain',
      blankLinesBefore: pendingBlankLines,
    });
    pendingBlankLines = 0;
  }

  return blocks;
}

function parsePlainSections(text, headingPattern, startAt) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;
  let started = !startAt;
  let pendingBlankLines = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!started) {
      if (line === startAt) started = true;
      else continue;
    }

    if (headingPattern.test(line)) {
      current = { title: line, blocks: [] };
      sections.push(current);
      pendingBlankLines = 0;
      continue;
    }

    if (!current) continue;

    if (!line) {
      if (current.blocks.length) pendingBlankLines += 1;
      continue;
    }

    current.blocks.push({
      text: line,
      kind: 'plain',
      blankLinesBefore: pendingBlankLines,
    });
    pendingBlankLines = 0;
  }

  return sections;
}

function parseFadein(text) {
  const blocks = [];
  let pendingBlankLines = 0;
  const paragraphs = [...text.matchAll(/<para\b[^>]*>([\s\S]*?)<\/para>/g)];

  for (const match of paragraphs) {
    const body = match[1];
    const styleMatch = body.match(/<style\b[^>]*(?:basestyle|basestylename|name)="([^"]+)"/i);
    const style = styleMatch ? styleMatch[1] : 'Action';
    const value = [...body.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
      .map((item) => decodeXml(item[1]))
      .join('')
      .replace(/\r/g, '')
      .trim();

    if (!value) {
      if (blocks.length) pendingBlankLines += 1;
      continue;
    }

    blocks.push({
      text: value,
      kind: classifyFadeinStyle(style),
      blankLinesBefore: pendingBlankLines,
    });
    pendingBlankLines = 0;
  }

  return blocks;
}

function readBlocks(work) {
  const filePath = path.join(sourceDir, work.source);
  if (work.format === 'fadein') {
    return parseFadein(execFileSync('unzip', ['-p', filePath, 'document.xml'], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }));
  }

  const text = work.format === 'rtf' ? readRtfText(filePath) : readOfficeText(filePath);
  return parsePlainText(text, work.startAt, work.skipLeading);
}

function readSections(work) {
  const filePath = path.join(sourceDir, work.source);
  const text = work.format === 'rtf' ? readRtfText(filePath) : readOfficeText(filePath);
  return parsePlainSections(text, work.chapterPattern, work.startAt);
}

function renderBlocks(blocks) {
  return blocks
    .flatMap((block) => {
      const blankLines = Array.from(
        { length: block.blankLinesBefore },
        () => '      <p class="source-blank" aria-hidden="true"></p>',
      );
      const paragraph = `<p class="${block.kind}">${escapeHtml(block.text)}</p>`;
      return [...blankLines, `      ${paragraph}`];
    })
    .join('\n');
}

function renderPage(work, blocks) {
  const description = work.hideDescription ? '' : `  <p class="lead">${escapeHtml(work.description)}</p>\n`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(work.title)} · Nordenbox</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&display=swap" rel="stylesheet">
  <meta name="description" content="${escapeHtml(work.title)} — Nordenbox 作品">
  <link rel="stylesheet" href="../style.css">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
</head>
<body>

<header class="site-header">
  <div class="masthead">
    <h1 class="page-title">NORDENBOX</h1>
  </div>
  <nav class="site-nav">
    <a href="../home.html">Home</a>
    <span class="dot">·</span>
    <a href="../essays.html">Essays</a>
    <span class="dot">·</span>
    <a href="../fictions.html" class="active">Fictions</a>
    <span class="dot">·</span>
    <a href="../podcasts.html">Podcasts</a>
    <span class="dot">·</span>
    <a href="../projects.html">Projects</a>
    <span class="dot">·</span>
    <a href="../about.html">About</a>
  </nav>
</header>

<main class="page">
  <h2 class="section-title">${escapeHtml(work.title)}</h2>
${description}
  <section class="project">
${renderBlocks(blocks)}

    <p style="margin-top: 2em;">
      <a class="back-link" href="../fictions.html">← Back to Fictions</a>
    </p>
  </section>
</main>

<footer class="site-footer">
  <p>© 2026 Nordenbox</p>
</footer>
<script defer src="../article-guard.js"></script>

</body>
</html>
`;
}

function renderCollectionPage(work, sections) {
  const items = sections
    .map((section, index) => `      <li><a href="${work.slug}/fiction-${work.slug}-${index}.html">${escapeHtml(section.title)}</a></li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(work.title)} · Nordenbox</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&display=swap" rel="stylesheet">
  <meta name="description" content="${escapeHtml(work.title)} — Nordenbox 作品目录">
  <link rel="stylesheet" href="../style.css">
  <link rel="icon" type="image/svg+xml" href="../favicon.svg">
</head>
<body>

<header class="site-header">
  <div class="masthead">
    <h1 class="page-title">NORDENBOX</h1>
  </div>
  <nav class="site-nav">
    <a href="../home.html">Home</a>
    <span class="dot">·</span>
    <a href="../essays.html">Essays</a>
    <span class="dot">·</span>
    <a href="../fictions.html" class="active">Fictions</a>
    <span class="dot">·</span>
    <a href="../podcasts.html">Podcasts</a>
    <span class="dot">·</span>
    <a href="../projects.html">Projects</a>
    <span class="dot">·</span>
    <a href="../about.html">About</a>
  </nav>
</header>

<main class="page">
  <h2 class="section-title">${escapeHtml(work.title)}</h2>
  <p class="lead">${escapeHtml(work.description)}</p>

  <section class="project">
    <h3>章节目录</h3>
    <ol>
${items}
    </ol>

    <p style="margin-top: 2em;">
      <a class="back-link" href="../fictions.html">← Back to Fictions</a>
    </p>
  </section>
</main>

<footer class="site-footer">
  <p>© 2026 Nordenbox</p>
</footer>
<script defer src="../article-guard.js"></script>

</body>
</html>
`;
}

function renderChapterPage(work, section, index, total) {
  const previous = index > 0
    ? `<a class="chapter-link" href="fiction-${work.slug}-${index - 1}.html">← ${escapeHtml('上一章')}</a>`
    : '<span></span>';
  const next = index + 1 < total
    ? `<a class="chapter-link" href="fiction-${work.slug}-${index + 1}.html">${escapeHtml('下一章')} →</a>`
    : '<span></span>';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(work.title)} · ${escapeHtml(section.title)} · Nordenbox</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&display=swap" rel="stylesheet">
  <meta name="description" content="${escapeHtml(work.title)} ${escapeHtml(section.title)}">
  <link rel="stylesheet" href="../../style.css">
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg">
</head>
<body>

<header class="site-header">
  <div class="masthead">
    <h1 class="page-title">NORDENBOX</h1>
  </div>
  <nav class="site-nav">
    <a href="../../home.html">Home</a>
    <span class="dot">·</span>
    <a href="../../essays.html">Essays</a>
    <span class="dot">·</span>
    <a href="../../fictions.html" class="active">Fictions</a>
    <span class="dot">·</span>
    <a href="../../podcasts.html">Podcasts</a>
    <span class="dot">·</span>
    <a href="../../projects.html">Projects</a>
    <span class="dot">·</span>
    <a href="../../about.html">About</a>
  </nav>
</header>

<main class="page">
  <h2 class="section-title">${escapeHtml(work.title)}</h2>
  <p class="lead">${escapeHtml(section.title)}</p>

  <section class="project">
${renderBlocks(section.blocks)}
  </section>

  <nav class="chapter-nav" aria-label="章节导航">
    ${previous}
    <a class="chapter-link" href="../fiction-${work.slug}.html">目录</a>
    ${next}
  </nav>
</main>

<footer class="site-footer">
  <p>© 2026 Nordenbox</p>
</footer>
<script defer src="../../article-guard.js"></script>

</body>
</html>
`;
}

for (const work of works) {
  if (work.chapters) {
    const sections = readSections(work);
    if (!sections.length || sections.some((section) => !section.blocks.length)) {
      throw new Error(`No complete chapters extracted from ${work.source}`);
    }

    const chapterDir = path.join(outputDir, work.slug);
    fs.mkdirSync(chapterDir, { recursive: true });
    const collectionPath = path.join(outputDir, `fiction-${work.slug}.html`);
    fs.writeFileSync(collectionPath, renderCollectionPage(work, sections), 'utf8');

    sections.forEach((section, index) => {
      const chapterPath = path.join(chapterDir, `fiction-${work.slug}-${index}.html`);
      fs.writeFileSync(chapterPath, renderChapterPage(work, section, index, sections.length), 'utf8');
    });

    console.log(`${work.title}: ${sections.length} chapters -> ${collectionPath}`);
    continue;
  }

  const blocks = readBlocks(work);
  if (!blocks.length) throw new Error(`No text extracted from ${work.source}`);
  const outputPath = path.join(outputDir, `fiction-${work.slug}.html`);
  fs.writeFileSync(outputPath, renderPage(work, blocks), 'utf8');
  console.log(`${work.title}: ${blocks.length} blocks -> ${outputPath}`);
}
