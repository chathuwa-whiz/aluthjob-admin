// Applied before the first paint so a saved theme never flashes the other one.
// A separate file (not inline) so the site can run under a strict Content-Security-Policy.
try {
  var theme = localStorage.getItem('aj-admin-theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch (e) {
  // storage can be blocked; the page then follows the system theme
}
