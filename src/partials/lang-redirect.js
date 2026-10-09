(function (w) {
  // First visit to "/": follow the saved choice, else the browser language. Runs inline before paint.
  var stored = null;
  try { stored = w.localStorage.getItem('paquett.lang'); } catch (e) { stored = null; }
  var nav = w.navigator || {};
  var first = (nav.languages && nav.languages[0]) || nav.language || '';
  var pref = stored || (String(first).toLowerCase().indexOf('ro') === 0 ? 'ro' : 'en');
  if (pref === 'ro' && w.location.pathname === '/') {
    w.location.replace('/ro/' + (w.location.search || '') + (w.location.hash || ''));
  }
})(window);
