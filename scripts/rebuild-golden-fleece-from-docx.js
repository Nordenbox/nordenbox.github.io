#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const defaultSource = '/Users/nordenbox/Library/CloudStorage/Dropbox/Words/我的创作/我的文学/金羊毛_完成版_全文校对排版版.docx';
const sourcePath = process.argv[2] || defaultSource;
const outputDir = path.resolve(__dirname, '..', 'fictions', 'golden-fleece');

const chineseDigits = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function chapterNumber(title) {
  if (title === '楔子') return 0;

  const value = title.slice(1, -1);
  if (value === '十') return 10;
  if (value.startsWith('十')) return 10 + chineseDigits[value[1]];
  if (value.includes('十')) {
    return chineseDigits[value[0]] * 10 + chineseDigits[value[2]];
  }
  return chineseDigits[value];
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readDocxText(filePath) {
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
    .replace(/\u0000/g, '')
    .replace(/\r/g, '');
}

function parseSections(text) {
  const lines = text.split('\n');
  const headingPattern = /^(楔子|第[零〇一二两三四五六七八九十]+章)$/;
  const sections = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(headingPattern);

    if (heading) {
      current = {
        number: chapterNumber(heading[1]),
        title: heading[1],
        blocks: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    if (line === '') {
      if (current.blocks.length > 0) {
        current.pendingBlankLines = (current.pendingBlankLines || 0) + 1;
      }
      continue;
    }

    current.blocks.push({
      text: line,
      blankLinesBefore: current.pendingBlankLines || 0,
    });
    current.pendingBlankLines = 0;
  }

  return sections;
}

function renderParagraphs(blocks) {
  return blocks
    .flatMap((block) => {
      const blankLines = Array.from(
        { length: block.blankLinesBefore },
        () => '      <p class="source-blank" aria-hidden="true"></p>',
      );
      const paragraph = block.text === '*'
        ? '      <p class="scene-break">＊</p>'
        : `      <p>${escapeHtml(block.text)}</p>`;
      return [...blankLines, paragraph];
    })
    .join('\n');
}

function renderNavigation(number) {
  const links = [
    '      <a class="chapter-link toc" href="fiction-golden-fleece.html">目录</a>',
  ];

  if (number > 0) {
    links.push(`      <a class="chapter-link previous" href="fiction-golden-fleece-${number - 1}.html">← 上一章</a>`);
  }
  if (number < 15) {
    links.push(`      <a class="chapter-link next" href="fiction-golden-fleece-${number + 1}.html">下一章 →</a>`);
  }

  return links.join('\n');
}

function renderPage(section) {
  const title = `The Golden Fleece · 金羊毛 · ${section.title} · Nordenbox`;
  const description = `《金羊毛》${section.title} — Nordenbox 长篇小说`;
  const heading = section.number === 0
    ? '  <h2 class="page-title">The Golden Fleece — 楔子</h2>'
    : `  <h2 class="section-title">金羊毛</h2>\n  <p class="lead">${section.title}</p>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600&display=swap" rel="stylesheet">
  <meta name="description" content="${description}">
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
${heading}

  <section class="project">
${renderParagraphs(section.blocks)}
  </section>

  <nav class="chapter-nav">
${renderNavigation(section.number)}
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

const sections = parseSections(readDocxText(sourcePath));
const expected = Array.from({ length: 16 }, (_, number) => number);
const actual = sections.map((section) => section.number);

if (actual.length !== expected.length || actual.some((number, index) => number !== expected[index])) {
  throw new Error(`Unexpected Golden Fleece sections: ${actual.join(', ')}`);
}

fs.mkdirSync(outputDir, { recursive: true });
for (const section of sections) {
  const filePath = path.join(outputDir, `fiction-golden-fleece-${section.number}.html`);
  fs.writeFileSync(filePath, renderPage(section), 'utf8');
}

console.log(`Rebuilt ${sections.length} Golden Fleece pages from ${sourcePath}`);
