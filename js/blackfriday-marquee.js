(() => {
  const tape = document.querySelector('[data-bf-marquee]');
  if (!tape) return;
  const button = tape.querySelector('.bf-tape-toggle');
  if (!button) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;

  function sync() {
    tape.classList.toggle('is-paused', paused || reducedMotion.matches);
    button.hidden = reducedMotion.matches;
    button.setAttribute('aria-label', paused ? 'Resume Black Friday animation' : 'Pause Black Friday animation');
    button.title = paused ? 'Resume animation' : 'Pause animation';
  }

  button.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  reducedMotion.addEventListener('change', sync);
  sync();
  tape.dataset.marqueeReady = 'true';
})();
