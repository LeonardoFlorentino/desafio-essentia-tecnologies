// Applies the theme picked in this browser before the first paint, so a dark choice never flashes
// light while the app loads. With no choice saved, the CSS follows the system (prefers-color-scheme).
// A file of its own, not inline: the Content-Security-Policy only runs scripts from this site.
try {
  var theme = localStorage.getItem('theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch (error) {
  // Storage blocked (private mode, policy): the system's theme it is.
}
