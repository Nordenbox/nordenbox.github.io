const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputFile = path.join(root, 'content-index.js');

const PAGE_GROUPS = [
  { key: 'essays', label: 'Essays', dir: 'essays', include: (rel) => rel.startsWith('essays/') && rel !== 'essays.html' },
  { key: 'fictions', label: 'Fictions', dir: 'fictions', include: (rel) => rel.startsWith('fictions/') && rel !== 'fictions.html' && rel !== 'fictions/index.html' },
  { key: 'non-fiction', label: 'Non-fiction', dir: '.', include: (rel) => rel === 'non-fiction-empty-mountains-spiritual-rain.html' || rel.startsWith('non-fiction-') },
  { key: 'projects', label: 'Projects', dir: 'projects', include: (rel) => rel.startsWith('projects/') && rel !== 'projects.html' },
  { key: 'razzmatazz', label: 'Razzmatazz', dir: 'razzmatazz', include: (rel) => rel.startsWith('razzmatazz/') && rel !== 'razzmatazz/index.html' },
];

const MANUAL_SECTIONS = {
  podcasts: [
    {
      title: 'Dubliners - Two Stories: Eveline/The Dead',
      href: 'podcasts.html#dublin-joyce-and-the-dead',
      excerpt: '乔伊斯的《都柏林人》小说集中的两篇，围绕〈The Dead〉等文本展开。',
      date: '2026-08-01T00:00:00.000Z',
      label: 'Podcasts',
    },
    {
      title: 'Sherlock and Watson',
      href: 'podcasts.html#sherlock-and-watson',
      excerpt: '两人的关系，而不是破案桥段和推理，让现代读者看到一种非常新的魅力。',
      date: '2026-08-02T00:00:00.000Z',
      label: 'Podcasts',
    },
  ],
};

function listHtmlFiles(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === '.codex' || entry.name === 'node_modules') continue;
        stack.push(full);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
    }
  }
  return files;
}

function readMatch(file, pattern) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(pattern);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function stripTags(text) {
  return text.replace(/<[^>]*>/g, '');
}

function excerptFromFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lead = readMatch(file, /<p class="lead">([\s\S]*?)<\/p>/i);
  if (lead) return decodeEntities(stripTags(lead));

  const section = text.match(/<section class="project">([\s\S]*?)<\/section>/i);
  if (!section) return '';

  const paragraphs = [...section[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decodeEntities(stripTags(m[1]).replace(/\s+/g, ' ').trim()))
    .filter(Boolean);
  return paragraphs.slice(0, 2).join(' ');
}

function getFileDate(file) {
  return fs.statSync(file).mtime.toISOString();
}

function classify(rel) {
  if (rel.startsWith('essays/')) return 'essays';
  if (rel.startsWith('fictions/')) return 'fictions';
  if (rel.startsWith('projects/')) return 'projects';
  if (rel.startsWith('razzmatazz/')) return 'razzmatazz';
  if (rel.startsWith('non-fiction-')) return 'non-fiction';
  return null;
}

function isCollectionPage(rel) {
  return new Set([
    'home.html',
    'essays.html',
    'fictions.html',
    'non-fiction.html',
    'projects.html',
    'podcasts.html',
    'about.html',
    'index.html',
    '404.html',
    'art-review.html',
    'razzmatazz/index.html',
    'non-fiction-entry.html',
  ]).has(rel);
}

function buildSectionEntries(key, label, includeFn) {
  const files = listHtmlFiles(root)
    .map((abs) => path.relative(root, abs).replace(/\\/g, '/'))
    .filter((rel) => !isCollectionPage(rel) && includeFn(rel));

  return files
    .map((rel) => {
      const file = path.join(root, rel);
      const title = readMatch(file, /<h2 class="section-title">([\s\S]*?)<\/h2>/i) || readMatch(file, /<title>(.*?)\s*·\s*Nordenbox<\/title>/i);
      const href = rel;
      const excerpt = excerptFromFile(file);
      const date = getFileDate(file);
      return {
        key,
        label,
        title: decodeEntities(stripTags(title)),
        href,
        excerpt,
        date,
      };
    })
    .sort((a, b) => {
      const delta = new Date(b.date) - new Date(a.date);
      if (delta) return delta;
      return a.href.localeCompare(b.href);
    });
}

const sections = {};
for (const group of PAGE_GROUPS) {
  sections[group.key] = buildSectionEntries(group.key, group.label, group.include);
}
for (const [key, items] of Object.entries(MANUAL_SECTIONS)) {
  sections[key] = items.slice().sort((a, b) => {
    const delta = new Date(b.date) - new Date(a.date);
    if (delta) return delta;
    return a.href.localeCompare(b.href);
  });
}

const all = Object.values(sections)
  .flat()
  .sort((a, b) => {
    const delta = new Date(b.date) - new Date(a.date);
    if (delta) return delta;
    return a.href.localeCompare(b.href);
  });

const output = `window.NORDENBOX_CONTENT_INDEX = ${JSON.stringify({ all, sections }, null, 2)};\n`;
fs.writeFileSync(outputFile, output);
