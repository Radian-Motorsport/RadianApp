// Shared top-bar renderer for all pages
// Usage: include this script and add <div id="topBar"></div> in body; it will render on DOMContentLoaded

(function () {
  const pages = [
    { key: 'index', label: 'Strategy', href: 'index.html' },
    { key: 'inputs', label: 'Inputs', href: 'inputs.html' },
    { key: 'planner', label: 'Endurance', href: 'planner.html' },
    { key: 'staticplanner', label: 'Static Planner', href: 'staticplanner.html' },
    { key: 'connections', label: 'Connections', href: 'connections.html' }
  ];

  function detectActiveKey() {
    const path = (location.pathname || '').toLowerCase();
    for (const p of pages) {
      if (path.endsWith('/' + p.href.toLowerCase())) return p.key;
    }
    // Fallback: index for root or unknown
    return 'index';
  }

  function renderTopBar() {
    const hostEl = document.getElementById('topBar') || document.querySelector('.top-bar');
    if (!hostEl) return;
    hostEl.classList.add('top-bar');

    const activeKey = detectActiveKey();

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.gap = '8px';

    pages.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.label;
      btn.onclick = () => {
        const here = location.pathname.toLowerCase().endsWith('/' + p.href.toLowerCase());
        if (!here) location.href = p.href;
      };
      if (p.key === activeKey) btn.classList.add('active');
      left.appendChild(btn);
    });

    hostEl.innerHTML = '';
    hostEl.appendChild(left);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderTopBar);
  } else {
    renderTopBar();
  }
})();
