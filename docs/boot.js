/* A failed first download should explain itself instead of leaving a blank screen. */
(() => {
  const ready = () => document.documentElement.dataset.pplReady === '1';
  function explain() {
    if (ready()) return;
    const main = document.getElementById('main');
    if (!main || main.querySelector('[data-startup-error]')) return;
    const panel = document.createElement('section');
    panel.className = 'panel boot-screen';
    panel.dataset.startupError = 'true';
    panel.innerHTML = '<p class="eyebrow">PPL TRAINING</p><h1>Der Start wurde unterbrochen.</h1><p>Verbinde dich beim ersten Start mit dem Internet und lade die Seite erneut. Deine gespeicherten Trainings werden dabei nicht gelöscht.</p><button class="btn primary" type="button">Erneut laden</button>';
    panel.querySelector('button').addEventListener('click', () => location.reload());
    main.replaceChildren(panel);
  }
  const timeout = setTimeout(explain, 10000);
  window.addEventListener('error', explain);
  window.addEventListener('unhandledrejection', explain);
  window.addEventListener('ppl-ready', () => clearTimeout(timeout), {once: true});
})();
