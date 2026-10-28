/* Launch splash: visible ~3s from page start on every fresh load, then fades out; the app boots underneath. */
(function () {
  var el = document.getElementById('splash'); if (!el) return;
  var SHOW = 3000, FADE = 600;
  var rm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var meta = document.querySelector('meta[name="theme-color"]'), appColor = meta && meta.getAttribute('content');
  if (meta) meta.setAttribute('content', el.getAttribute('data-theme') || '#0A2459');
  var stars = el.querySelector('.sp-stars');
  if (stars) { var pos = [[12,14,7],[84,10,9],[70,22,5],[22,30,5],[90,36,6],[8,52,6],[80,60,5],[30,8,5],[55,6,6],[16,72,5],[88,78,6]];
    pos.forEach(function (p, i) { var s = document.createElement('i'); s.style.left = p[0] + '%'; s.style.top = p[1] + '%'; s.style.setProperty('--s', p[2] + 'px'); s.style.animationDelay = (i * 0.37 % 2.4) + 's'; stars.appendChild(s); }); }
  var start = (window.performance && performance.now) ? performance.now() : 0;
  var wait = Math.max(0, SHOW - start);
  setTimeout(function () {
    if (meta && appColor) meta.setAttribute('content', appColor);
    if (rm) { el.remove(); return; }
    el.classList.add('sp-out');
    setTimeout(function () { el.remove(); }, FADE + 50);
  }, wait);
})();
