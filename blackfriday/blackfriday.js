(() => {
  const button = document.querySelector('.motion-toggle');
  const label = button.querySelector('.motion-label');
  const icon = button.querySelector('.motion-icon');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pausedByVisitor = false;

  function syncMotion() {
    const paused = pausedByVisitor || reducedMotion.matches || document.hidden;
    document.body.classList.toggle('motion-paused', paused);
    button.hidden = reducedMotion.matches;
    button.setAttribute('aria-pressed', String(pausedByVisitor));
    label.textContent = pausedByVisitor ? 'Resume animation' : 'Pause animation';
    icon.textContent = pausedByVisitor ? '▶' : 'Ⅱ';
  }

  button.addEventListener('click', () => {
    pausedByVisitor = !pausedByVisitor;
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
