(() => {
  const data = window.NORDENBOX_CONTENT_INDEX;
  if (!data) return;
  const sitePrefix = window.NORDENBOX_SITE_PREFIX || '';

  const pages = {
    all: data.all || [],
    essays: data.sections?.essays || [],
    fictions: data.sections?.fictions || [],
    'non-fiction': data.sections?.['non-fiction'] || [],
    projects: data.sections?.projects || [],
    podcasts: data.sections?.podcasts || [],
    razzmatazz: data.sections?.razzmatazz || [],
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const renderCard = (item) => {
    const date = formatDate(item.date);
    const label = item.label || '';
    const href = `${sitePrefix}${item.href}`;
    return `
      <article class="latest-card">
        <div class="latest-meta">${escapeHtml(label)}${date ? `<span class="latest-date">${escapeHtml(date)}</span>` : ''}</div>
        <h3><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a></h3>
        <p class="latest-excerpt">${escapeHtml(item.excerpt || '')}</p>
        <a class="latest-link" href="${escapeHtml(href)}">阅读全文 →</a>
      </article>
    `;
  };

  const renderItemList = (items, emptyText) => {
    if (!items.length) return `<p class="latest-empty">${escapeHtml(emptyText)}</p>`;
    return items.map(renderCard).join('');
  };

  document.querySelectorAll('[data-latest-feed]').forEach((container) => {
    const scope = container.getAttribute('data-latest-feed') || 'all';
    const limit = Number(container.getAttribute('data-latest-limit') || 4);
    const offset = Number(container.getAttribute('data-latest-offset') || 0);
    const items = (pages[scope] || pages.all).slice(offset, offset + limit);

    container.innerHTML = renderItemList(items, 'No items yet.');
  });

  document.querySelectorAll('[data-all-feed]').forEach((container) => {
    const scope = container.getAttribute('data-all-feed') || 'all';
    const offset = Number(container.getAttribute('data-all-offset') || 0);
    const limitAttr = container.getAttribute('data-all-limit');
    const source = pages[scope] || pages.all;
    const items = limitAttr ? source.slice(offset, offset + Number(limitAttr)) : source.slice(offset);

    container.innerHTML = renderItemList(items, 'No items yet.');
  });

  document.querySelectorAll('[data-featured-feed]').forEach((container) => {
    const scope = container.getAttribute('data-featured-feed') || 'all';
    const offset = Number(container.getAttribute('data-featured-offset') || 0);
    const item = (pages[scope] || pages.all)[offset];

    if (!item) {
      container.innerHTML = '<p class="latest-empty">No featured item yet.</p>';
      return;
    }

    const date = formatDate(item.date);
    const href = `${sitePrefix}${item.href}`;
    const label = item.label || scope;
    container.innerHTML = `
      <article class="featured-card">
        <div class="latest-meta">${escapeHtml(label)}${date ? `<span class="latest-date">${escapeHtml(date)}</span>` : ''}</div>
        <h3><a href="${escapeHtml(href)}">${escapeHtml(item.title)}</a></h3>
        <p class="latest-excerpt">${escapeHtml(item.excerpt || '')}</p>
        <a class="latest-link" href="${escapeHtml(href)}">阅读全文 →</a>
      </article>
    `;
  });
})();
