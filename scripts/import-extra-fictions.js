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
    source: 'Lilie 2.0 送审版本.fadein',
    slug: 'lilie-2',
    title: 'Lilie 2.0',
    description: '电影剧本。雪地、警察与一段逐渐展开的往事。',
    format: 'fadein',
  },
  {
    source: 'The Funeral V7.5.fadein',
    slug: 'the-funeral',
    title: 'The Funeral V7.5',
    description: '电影剧本。一场葬礼，以及围绕病床与记忆展开的故事。',
    format: 'fadein',
  },
  {
    source: '温暖的机器原著小说_校订版.docx',
    slug: 'warm-machine',
    title: '温暖的机器 · The Warm Machine',
    description: '一部以电子邮件、记忆和数字存在为线索展开的小说。',
    format: 'office',
  },
  {
    source: '远东特快剧本.fadein',
    slug: 'far-east-express',
    title: '远东特快',
    description: '电影剧本。关于一列列车、旧日电影与人物命运的故事。',
    format: 'fadein',
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

function correctObviousTypos(text) {
  return text
    .replace(/的的(?!确确)/g, '的')
    .replace(/渐渐地地面/g, '渐渐地，地面')
    .replace(/哭天抢地地表/g, '哭天抢地表')
    .replace(/特地地强调/g, '特地强调')
    .replace(/站在在沙发边/g, '站在沙发边')
    .replace(/顶在在后背/g, '顶在后背')
    .replace(/混在在人群/g, '混在人群')
    .replace(/混在在一起/g, '混在一起')
    .replace(/正在在店员包装/g, '正在由店员包装')
    .replace(/远远在在海滩远处/g, '远远地在海滩远处')
    .replace(/坐在在地上/g, '坐在地上')
    .replace(/放在在火前/g, '放在火前')
    .replace(/面在在反射/g, '面在反射')
    .replace(/被被众人/g, '被众人')
    .replace(/看到到处/g, '看见到处')
    .replace(/但是是属于/g, '但是属于')
    .replace(/而是是用了/g, '而是用了')
    .replace(/便是是自己/g, '便是自己')
    .replace(/哪里是是组织/g, '哪里是组织')
    .replace(/传来了了一句话/g, '传来了一句话')
    .replace(/一身叹息/g, '一声叹息')
    .replace(/然后后退/g, '然后退')
    .replace(/然后后面的旅途/g, '后面的旅途')
    .replace(/呆了了十几个小时/g, '呆了十几个小时')
    .replace(/和和蔼/g, '和蔼')
    .replace(/和和善/g, '和善')
    .replace(/平和和不动声色/g, '平和而不动声色')
    .replace(/默契和和谐/g, '默契与和谐')
    .replace(/不由得得出了/g, '不由得出了')
    .replace(/存在在这个世界上/g, '存在于这个世界上')
    .replace(/存在在这个地方/g, '存在于这个地方')
    .replace(/装置在在南亚/g, '装置在南亚')
    .replace(/很多多余/g, '很多余')
    .replace(/受到到尊重/g, '受到尊重')
    .replace(/传到到合不勒汗/g, '传到合不勒汗')
    .replace(/原著居民/g, '原住居民')
    .replace(/原著民/g, '原住民')
    .replace(/这着为期/g, '这次为期')
    .replace(/带给了他们带来/g, '给他们带来')
    .replace(/跟多收入/g, '更多收入')
    .replace(/莫不可测/g, '莫测')
    .replace(/跟何况/g, '更何况')
    .replace(/还见的还少/g, '还见得还少')
    .replace(/它们走路时/g, '他们走路时')
    .replace(/它们获得跟/g, '他们获得更')
    .replace(/它们获得更多/g, '他们获得更多')
    .replace(/没有知道他的名字/g, '没有人知道他的名字')
    .replace(/昏暗的灯关下/g, '昏暗的灯光下')
    .replace(/那时老人最小的儿子/g, '那是老人最小的儿子')
    .replace(/以为他们的存在/g, '因为他们的存在')
    .replace(/亚鲁藏布江/g, '雅鲁藏布江')
    .replace(/事件费劲/g, '十分费劲')
    .replace(/生命总结在/g, '生命终结在');
}

function readOfficeText(filePath) {
  return correctObviousTypos(normalizeText(execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })));
}

function readRtfText(filePath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nordenbox-central-hotel-'));
  try {
    execFileSync(soffice, ['--headless', '--convert-to', 'txt:Text', '--outdir', tempDir, filePath], {
      stdio: 'ignore',
      timeout: 60_000,
    });
    const outputPath = path.join(tempDir, `${path.basename(filePath, '.rtf')}.txt`);
    return correctObviousTypos(normalizeText(fs.readFileSync(outputPath, 'utf8')));
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

    const correctedValue = correctObviousTypos(value);

    if (!correctedValue) {
      if (blocks.length) pendingBlankLines += 1;
      continue;
    }

    blocks.push({
      text: correctedValue,
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
