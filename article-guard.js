(() => {
  const articleRoot = document.querySelector('main .project');
  if (!articleRoot) return;

  const sourceLink = document.querySelector('.article-source .source-link');
  if (!sourceLink) return;

  document.body.classList.add('protect-copy');

  const pageTitle =
    document.querySelector('.section-title')?.textContent?.trim() ||
    document.title.replace(/\s*·\s*Nordenbox$/, '').trim();
  const sourceHref = sourceLink.href || location.href;

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.project, .article-source')) {
      event.preventDefault();
    }
  });

  document.addEventListener('copy', (event) => {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return;

    const trailer = '\n\nSource: ' + pageTitle + '\n' + sourceHref;
    event.clipboardData.setData('text/plain', selection + trailer);
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (key === 's' || key === 'p')) {
      event.preventDefault();
    }
  });

  const blocks = Array.from(articleRoot.children).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    return !element.querySelector('.back-link');
  });

  if (blocks.length <= 4) return;

  const foldStartIndex = 4;
  const foldBlocks = blocks.slice(foldStartIndex);
  if (!foldBlocks.length) return;

  const foldWrap = document.createElement('div');
  foldWrap.className = 'article-fold';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'article-fold-toggle';
  toggle.textContent = '继续阅读 / Continue reading';

  toggle.addEventListener('click', () => {
    foldWrap.classList.add('is-open');
    toggle.remove();
  });

  const backLinkBlock = Array.from(articleRoot.children).find((element) =>
    element.querySelector?.('.back-link')
  );

  const insertionPoint = backLinkBlock || null;
  articleRoot.insertBefore(toggle, insertionPoint);
  articleRoot.insertBefore(foldWrap, toggle);
  foldBlocks.forEach((block) => foldWrap.appendChild(block));
})();
