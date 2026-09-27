#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const replacements = [
  ['渐渐地地面', '渐渐地，地面'],
  ['哭天抢地地表', '哭天抢地表'],
  ['特地地强调', '特地强调'],
  ['站在在沙发边', '站在沙发边'],
  ['顶在在后背', '顶在后背'],
  ['混在在人群', '混在人群'],
  ['混在在一起', '混在一起'],
  ['正在在店员包装', '正在由店员包装'],
  ['远远在在海滩远处', '远远地在海滩远处'],
  ['坐在在地上', '坐在地上'],
  ['放在在火前', '放在火前'],
  ['面在在反射', '面在反射'],
  ['被被众人', '被众人'],
  ['看到到处', '看见到处'],
  ['但是是属于', '但是属于'],
  ['而是是用了', '而是用了'],
  ['便是是自己', '便是自己'],
  ['哪里是是组织', '哪里是组织'],
  ['传来了了一句话', '传来了一句话'],
  ['一身叹息', '一声叹息'],
  ['然后后退', '然后退'],
  ['然后后面的旅途', '后面的旅途'],
  ['呆了了十几个小时', '呆了十几个小时'],
  ['和和蔼', '和蔼'],
  ['和和善', '和善'],
  ['平和和不动声色', '平和而不动声色'],
  ['默契和和谐', '默契与和谐'],
  ['不由得得出了', '不由得出了'],
  ['存在在这个世界上', '存在于这个世界上'],
  ['存在在这个地方', '存在于这个地方'],
  ['装置在在南亚', '装置在南亚'],
  ['很多多余', '很多余'],
  ['受到到尊重', '受到尊重'],
  ['传到到合不勒汗', '传到合不勒汗'],
  ['原著居民', '原住居民'],
  ['原著民', '原住民'],
  ['这着为期', '这次为期'],
  ['带给了他们带来', '给他们带来'],
  ['跟多收入', '更多收入'],
  ['莫不可测', '莫测'],
  ['跟何况', '更何况'],
  ['还见的还少', '还见得还少'],
  ['它们走路时', '他们走路时'],
  ['它们获得跟', '他们获得更'],
  ['它们获得更多', '他们获得更多'],
  ['没有知道他的名字', '没有人知道他的名字'],
  ['昏暗的灯关下', '昏暗的灯光下'],
  ['那时老人最小的儿子', '那是老人最小的儿子'],
  ['以为他们的存在', '因为他们的存在'],
  ['亚鲁藏布江', '雅鲁藏布江'],
  ['事件费劲', '十分费劲'],
  ['生命总结在', '生命终结在'],
];

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', '.codex', 'node_modules'].includes(entry.name)) files.push(...listHtmlFiles(file));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(file);
    }
  }
  return files;
}

for (const file of listHtmlFiles(root)) {
  const original = fs.readFileSync(file, 'utf8');
  let corrected = original.replace(/的的(?!确确)/g, '的');
  for (const [from, to] of replacements) corrected = corrected.split(from).join(to);
  if (corrected !== original) {
    fs.writeFileSync(file, corrected, 'utf8');
    console.log(path.relative(root, file));
  }
}
