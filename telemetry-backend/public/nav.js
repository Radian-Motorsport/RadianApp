// Shared top-bar renderer for all pages
// Usage: include this script and add <div id="topBar"></div> in body; it will render on DOMContentLoaded

(function () {
  const pages = [
    { key: 'index', label: 'Strategy', href: 'index.html', colorClass: 'active-page-1' },
    { key: 'inputs', label: 'Inputs', href: 'inputs.html', colorClass: 'active-page-2' },
    { key: 'planner', label: 'Endurance', href: 'planner.html', colorClass: 'active-page-3' },
    { key: 'staticplanner', label: 'Static Planner', href: 'staticplanner.html', colorClass: 'active-page-4' },
    { key: 'connections', label: 'Connections', href: 'connections.html', colorClass: 'active-page-5' }
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
    left.style.flexWrap = 'wrap'; // Allow buttons to wrap
    left.style.justifyContent = 'center'; // Center wrapped buttons
    left.style.width = '100%'; // Take full width to allow wrapping

    pages.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.label;
      btn.onclick = () => {
        const here = location.pathname.toLowerCase().endsWith('/' + p.href.toLowerCase());
        if (!here) location.href = p.href;
      };
      if (p.key === activeKey) {
        btn.classList.add('active');
        btn.classList.add(p.colorClass); // Apply the specific color class
      }
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
