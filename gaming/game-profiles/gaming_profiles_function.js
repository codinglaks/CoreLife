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

  /* Scroll reveal (threshold 0 so tall elements still show)
     Cards already on screen stay visible straight away; only cards below the fold fade in. */
  const revealEls = Array.from(document.querySelectorAll('.profile-card'));

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const pendingEls = revealEls.filter((el) => el.getBoundingClientRect().top >= viewportH * 0.95);
    pendingEls.forEach((el) => el.classList.add('js-reveal'));

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.style.setProperty('--reveal-delay', Math.min(order++, 4) * 70 + 'ms');
          el.classList.add('is-visible');
          observer.unobserve(el);
          // Once the fade-in is done, drop the helper classes so hover effects work normally
          window.setTimeout(() => {
            el.classList.remove('js-reveal', 'is-visible');
            el.style.removeProperty('--reveal-delay');
          }, 1000);
        });
      },
      { threshold: 0, rootMargin: '0px 0px -30px 0px' }
    );
    pendingEls.forEach((el) => revealObserver.observe(el));
  }

  /* Lightbox */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  let lastFocusedEl = null;

  function openLightbox(imgEl, gameName) {
    lastFocusedEl = document.activeElement;
    // Use the larger version of the image in the viewer (the grid shows a lighter one)
    lightboxImg.src = imgEl.dataset.full || imgEl.currentSrc || imgEl.src;
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
    // Keep the image loaded so reopening it is instant (no blank flash)
    window.setTimeout(() => {
      lightbox.hidden = true;
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

    // Start fetching the larger image as soon as someone shows interest, so the viewer opens instantly
    const prefetchFull = () => {
      if (img.dataset.full && !img.dataset.prefetched) {
        img.dataset.prefetched = '1';
        const pre = new Image();
        pre.src = img.dataset.full;
      }
    };
    frame.addEventListener('pointerenter', prefetchFull, { once: true });
    frame.addEventListener('touchstart', prefetchFull, { once: true, passive: true });
    frame.addEventListener('focus', prefetchFull, { once: true });

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