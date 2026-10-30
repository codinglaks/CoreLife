/* Shared theme: one saved choice applies to every CoreLife page */
(function () {
  'use strict';

  var KEY = 'corelife-theme';
  var root = document.documentElement;

  function saved() {
    try {
      var t = localStorage.getItem(KEY);
      if (t === 'light' || t === 'dark') return t;
    } catch (e) { /* ignore */ }
    return 'dark';
  }

  function store(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
  }

  // Set the theme and keep the toggle button's labels in step
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }

  // Runs in <head>, before first paint, so there is no flash
  apply(saved());

  document.addEventListener('DOMContentLoaded', function () {
    apply(saved());
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      store(next);
      apply(next);
    });
  });

  // Follow changes made in other tabs and restored back/forward pages
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(saved()); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) apply(saved()); });
})();