/* Gaming profiles script */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Back button */
  // Use browser history when available, else follow the link
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function (e) {
      if (window.history.length > 1) {
        e.preventDefault();
        window.history.back();
      }
    });
  }

  /* Scroll reveal (threshold 0 so tall elements still show) */
  const revealEls = Array.from(document.querySelectorAll('.js-reveal'));

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    revealEls.forEach((el, i) => {
      el.style.setProperty('--reveal-delay', (i % 8) * 70 + 'ms');
    });

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* Lightbox */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocusedEl = null;

  function openLightbox(imgEl, gameName) {
    lastFocusedEl = document.activeElement;
    lightboxImg.src = imgEl.src;
    lightboxImg.alt = imgEl.alt;
    lightboxCaption.textContent = gameName;
    lightbox.hidden = false;
    // Next frame so the transition plays
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      lightbox.hidden = true;
      lightboxImg.src = '';
    }, prefersReducedMotion ? 0 : 300);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  document.querySelectorAll('.profile-card').forEach((card) => {
    const frame = card.querySelector('.profile-image-frame');
    const img = card.querySelector('img');
    const gameName = card.dataset.game || card.querySelector('h2')?.textContent || '';

    frame.setAttribute('tabindex', '0');
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', `View ${gameName} player ID larger`);

    frame.addEventListener('click', () => openLightbox(img, gameName));
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(img, gameName);
      }
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
})();