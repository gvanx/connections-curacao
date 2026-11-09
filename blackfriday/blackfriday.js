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
    icon.innerHTML = pausedByVisitor ? "<svg class=\"ui-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" style=\"display:inline-block;vertical-align:-.125em;flex-shrink:0\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path d=\"m7 3 14 9-14 9Z\"/></svg>" : "<svg class=\"ui-icon\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" style=\"display:inline-block;vertical-align:-.125em;flex-shrink:0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M8 4v16M16 4v16\"/></svg>";
  }

  button.addEventListener('click', () => {
    pausedByVisitor = !pausedByVisitor;
    syncMotion();
  });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
})();
