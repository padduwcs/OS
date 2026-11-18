/* Thanh công cụ và mục lục, dựa trên giao diện CSAI. */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const readPreference = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const savePreference = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Giao diện vẫn hoạt động khi trình duyệt tắt bộ nhớ của trang.
    }
  };

  const themeButton = document.querySelector('.theme-btn');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = readPreference('pados-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') {
    root.dataset.theme = savedTheme;
  }
  themeButton.hidden = false;
  themeButton.addEventListener('click', () => {
    const theme = root.dataset.theme || (systemTheme.matches ? 'dark' : 'light');
    const next = theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    savePreference('pados-theme', next);
  });

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const printButton = document.querySelector('.print-btn');
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
  let beforePrint;
  addEventListener('beforeprint', () => {
    if (beforePrint) return;
    const details = [...document.querySelectorAll('details:not([open])')];
    beforePrint = { theme: root.dataset.theme, details };
    root.dataset.theme = 'light';
    details.forEach((item) => { item.open = true; });
  });
  addEventListener('afterprint', () => {
    if (!beforePrint) return;
    if (beforePrint.theme) root.dataset.theme = beforePrint.theme;
    else delete root.dataset.theme;
    beforePrint.details.forEach((item) => { item.open = false; });
    beforePrint = undefined;
  });

  const button = document.querySelector('.side-btn');
  const narrow = matchMedia('(max-width: 820px)');
  body.classList.add('nav-ready');
  body.classList.toggle('nav-hidden', readPreference('pados-nav') === 'hidden');
  button.hidden = false;

  function syncSidebar() {
    const open = narrow.matches
      ? body.classList.contains('nav-open')
      : !body.classList.contains('nav-hidden');
    button.setAttribute('aria-expanded', String(open));
  }

  function closeOverlay() {
    body.classList.remove('nav-open');
    syncSidebar();
  }

  button.addEventListener('click', () => {
    if (narrow.matches) {
      const open = body.classList.toggle('nav-open');
      if (open) sidebar.querySelector('a').focus();
    } else {
      const hidden = body.classList.toggle('nav-hidden');
      savePreference('pados-nav', hidden ? 'hidden' : 'shown');
    }
    syncSidebar();
  });
  narrow.addEventListener('change', closeOverlay);
  sidebar.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || !narrow.matches) return;
    closeOverlay();
    const target = document.getElementById(link.hash.slice(1));
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !body.classList.contains('nav-open')) return;
    closeOverlay();
    button.focus();
  });
  syncSidebar();

  const links = [...sidebar.querySelectorAll('a[href^="#"]')];
  const headings = links.map((link) => document.getElementById(link.hash.slice(1)));
  const progress = document.querySelector('.progress');
  let activeLink;
  let scheduled = false;

  function showPosition() {
    let current = -1;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top <= 130) current = index;
    });
    const nextLink = links[current];
    if (nextLink !== activeLink) {
      activeLink?.removeAttribute('aria-current');
      nextLink?.setAttribute('aria-current', 'location');
      activeLink = nextLink;
    }
    const available = root.scrollHeight - root.clientHeight;
    const fraction = available > 0 ? root.scrollTop / available : 0;
    progress.style.width = `${Math.min(1, Math.max(0, fraction)) * 100}%`;
    scheduled = false;
  }

  function schedulePosition() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(showPosition);
  }
  addEventListener('scroll', schedulePosition, { passive: true });
  addEventListener('resize', schedulePosition);
  addEventListener('load', schedulePosition);
  document.querySelector('.content').addEventListener('toggle', schedulePosition, true);
  showPosition();
})();
