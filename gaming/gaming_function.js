/* The Gaminggram script */

/* Mobile menu */
function initMobileNav() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (!menuToggle || !navLinks) return;

    // Stagger index for the menu animation
    navLinks.querySelectorAll('a').forEach((link, index) => {
        link.style.setProperty('--nav-i', index);
    });

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close the menu after a link click
    document.querySelectorAll('.nav-links a').forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

/* UPI copy */
function initUpiCopy() {
    const copyBtn = document.querySelector('.copy-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', copyUpiId);
}

function copyUpiId() {
    const upiId = document.getElementById('upiId').innerText;
    const btnText = document.getElementById('copyBtnText');
    const copyBtn = document.querySelector('.copy-btn');

    navigator.clipboard.writeText(upiId).then(() => {
        btnText.innerText = 'Copied!';

        if (copyBtn) {
            copyBtn.classList.add('copied');
        }

        setTimeout(() => {
            btnText.innerText = 'Copy';
            if (copyBtn) {
                copyBtn.classList.remove('copied');
            }
        }, 2000);
    });
}

/* Scroll reveal */
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '#socials.glass-card, #contact.glass-card, ' +
        '#collab.glass-card, #gamingsite.glass-card, #donate.glass-card'
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

    const cards = document.querySelectorAll('.glass-card, .banner-card');

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

/* Logo switcher */
function initLogoSwitcher() {
    const switcher = document.getElementById('logoSwitcher');
    const trigger = document.getElementById('logoSwitcherTrigger');
    const fan = document.getElementById('logoSwitcherFan');

    if (!switcher || !trigger || !fan) return;

    const openFan = () => {
        fan.classList.add('active');
        fan.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
    };

    const closeFan = () => {
        fan.classList.remove('active');
        fan.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        fan.classList.contains('active') ? closeFan() : openFan();
    });

    document.addEventListener('click', (event) => {
        if (!switcher.contains(event.target)) closeFan();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && fan.classList.contains('active')) closeFan();
    });
}

/* Back button */
function initBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (!backBtn) return;

    backBtn.addEventListener('click', (event) => {
        if (window.history.length > 1) {
            event.preventDefault();
            window.history.back();
        }
    });
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initUpiCopy();
    initScrollReveal();
    initCardSpotlight();
    initLogoSwitcher();
    initBackButton();
});