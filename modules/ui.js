const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 3h4v5H6zm8 0h4v5h-4z"/><path d="M6 8h4m4 0h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7.5 15h9"/>',
  field: '<circle cx="12" cy="12" r="2.5"/><path d="M12 2c4 3 6 6 6 10s-2 7-6 10c-4-3-6-6-6-10s2-7 6-10Z"/><path d="M2 12c3-4 6-6 10-6s7 2 10 6c-3 4-6 6-10 6s-7-2-10-6Z"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  beaker: '<path d="M8 3h8"/><path d="M9 3v7l-4 8a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-4-8V3"/><path d="M7 16h10"/><circle cx="11" cy="18" r=".6"/><circle cx="14" cy="14" r=".6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7m-7 4h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v5m-4 0h8"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 11.5v-6a1.5 1.5 0 0 1 3 0V12"/><path d="M14 10.5v-4a1.5 1.5 0 0 1 3 0V13"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L4.7 16a1.6 1.6 0 0 1 2.6-1.8L8 15"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  volumeOff: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m22 9-6 6m0-6 6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/>',
  reset: '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  play: '<path d="m7 4 13 8-13 8V4Z"/>',
  pause: '<path d="M7 4h4v16H7zm10 0h4v16h-4z"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
  wave: '<path d="M2 12h2l2-7 3 14 3-11 2 6 2-3h6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  spark: '<path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19"/><circle cx="12" cy="12" r="3"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>',
  cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5 20 20M8.5 16.5 20 4"/>',
  temp: '<path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0Z"/><path d="M12 9v7"/>',
  shield: '<path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>',
  atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>'
};

export function icon(name, cls = '') {
  const path = PATHS[name] || PATHS.info;
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${path}</svg>`;
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon === 'volume-off' ? 'volumeOff' : el.dataset.icon;
    el.innerHTML = icon(name);
  });
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(message, type = 'info', duration = 3200) {
  const region = document.getElementById('toastRegion');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icon(type === 'error' ? 'info' : type === 'success' ? 'check' : 'spark')}<span>${esc(message)}</span>`;
  region.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 320);
  }, duration);
}

export function openInfo(title, html) {
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoBody').innerHTML = html;
  const dialog = document.getElementById('infoDialog');
  if (!dialog.open) dialog.showModal();
}

export function download(filename, content, mime = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function rangeFill(input) {
  const min = Number(input.min || 0), max = Number(input.max || 100), val = Number(input.value);
  input.style.setProperty('--fill', `${((val - min) / (max - min)) * 100}%`);
}

export function bindRanges(root = document) {
  root.querySelectorAll('input[type=range]').forEach(input => {
    rangeFill(input);
    input.addEventListener('input', () => rangeFill(input));
  });
}

export function referenceHtml(ids, references) {
  const items = (ids || []).map(id => references.find(r => r.id === id)).filter(Boolean);
  if (!items.length) return '<p class="prose">No external references attached to this record.</p>';
  return `<div class="reference-list">${items.map(r => `
    <div class="reference-item"><span class="ref-id">[${esc(r.id)}]</span><div>
      <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a>
      <small>${esc(r.publisher)}${r.note ? ' · ' + esc(r.note) : ''}</small>
    </div></div>`).join('')}</div>`;
}

export function specRows(pairs) {
  return `<div class="spec-table">${pairs.map(([k, v]) => `<div class="spec-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
}

export function tags(items, cls = '') {
  return `<div class="tag-list">${items.map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('')}</div>`;
}