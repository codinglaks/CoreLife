/* Home page script */

/* Nav menu */
function initNavMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (!menuToggle || !navMenu) return;

    // Stagger index for the menu animation
    navMenu.querySelectorAll('.nav-menu-link').forEach((link, index) => {
        link.style.setProperty('--link-i', index);
    });

    const openMenu = () => {
        navMenu.classList.add('active');
        navMenu.setAttribute('aria-hidden', 'false');
        menuToggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        navMenu.classList.remove('active');
        navMenu.setAttribute('aria-hidden', 'true');
        menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        navMenu.classList.contains('active') ? closeMenu() : openMenu();
    });

    navMenu.querySelectorAll('.nav-menu-link').forEach((link) => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
        if (!navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navMenu.classList.contains('active')) {
            closeMenu();
        }
    });
}

/* Smooth scroll */
function initSmoothScroll() {
    document.querySelectorAll('a[data-scroll]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (!target) return;

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

/* Scroll reveal */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.profile-card, #collab.glass-card, #support.glass-card'
    );

    if (!targets.length) return;

    // Reduced-motion users (or very old browsers) just see everything straight away
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        return;
    }

    // Cards already on screen stay visible (no hide-then-show flicker); only cards below the fold fade in
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const pending = [];
    targets.forEach((el) => {
        if (el.getBoundingClientRect().top < viewportH * 0.95) return;
        el.classList.add('js-reveal');
        pending.push(el);
    });

    if (!pending.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            let order = 0;
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                el.style.setProperty('--reveal-delay', `${Math.min(order++, 3) * 0.08}s`);
                el.classList.add('is-visible');
                observer.unobserve(el);

                // Once the fade-in is done, drop the helper classes so normal hover effects come back
                window.setTimeout(() => {
                    el.classList.remove('js-reveal', 'is-visible');
                    el.style.removeProperty('--reveal-delay');
                }, 1000);
            });
        },
        { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );

    pending.forEach((el) => observer.observe(el));
}

/* Card spotlight */
function initCardSpotlight() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cards = document.querySelectorAll('.profile-banner, .glass-card');

    cards.forEach((card) => {
        let rect = null;
        let rectAt = 0;
        let frame = 0;
        let pointerX = 0;
        let pointerY = 0;

        // Update once per animation frame instead of on every mouse event
        const update = () => {
            frame = 0;
            const x = ((pointerX - rect.left) / rect.width) * 100;
            const y = ((pointerY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', `${x}%`);
            card.style.setProperty('--my', `${y}%`);
        };

        card.addEventListener('mousemove', (event) => {
            const now = performance.now();
            // Measure the card at most every 150ms (it only changes when the page scrolls)
            if (!rect || now - rectAt > 150) {
                rect = card.getBoundingClientRect();
                rectAt = now;
            }
            pointerX = event.clientX;
            pointerY = event.clientY;
            if (!frame) frame = window.requestAnimationFrame(update);
        });

        card.addEventListener('mouseleave', () => { rect = null; });
    });
}

/* Pause orbs when the tab is hidden */
function initOrbPerformanceGuard() {
    const pauseOrbs = () => {
        document.body.classList.toggle('orbs-paused', document.hidden);
    };

    document.addEventListener('visibilitychange', pauseOrbs);
    pauseOrbs();
}

/* Footer year */
function initFooterYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    initNavMenu();
    initSmoothScroll();
    initScrollReveal();
    initCardSpotlight();
    initOrbPerformanceGuard();
    initFooterYear();
});