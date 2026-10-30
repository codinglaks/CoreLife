/* Support page script */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Back button: ?from= first, then referrer, else home */
  const BACK_TARGETS = {
    home:    { href: '../index.html',                  label: 'CoreLife home' },
    gaming:  { href: '../gaming/gaming.html',          label: 'The Gaminggram' },
    tech:    { href: '../tech/tech.html',              label: 'Bit Sa Gyan' },
    pic_vdo: { href: '../visual-artist/pic_vdo.html',  label: 'Crazy Akshat' }
  };

  function detectOrigin() {
    const fromParam = new URLSearchParams(window.location.search).get('from');
    if (fromParam && Object.prototype.hasOwnProperty.call(BACK_TARGETS, fromParam)) return fromParam;

    if (document.referrer) {
      try {
        const path = new URL(document.referrer).pathname.toLowerCase();
        if (path.includes('/gaming'))                              return 'gaming';
        if (path.includes('/tech'))                                return 'tech';
        if (path.includes('/visual-artist') || path.includes('pic_vdo')) return 'pic_vdo';
      } catch (e) { /* Ignore malformed referrer */ }
    }
    return 'home';
  }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    const target = BACK_TARGETS[detectOrigin()];
    backBtn.setAttribute('href', target.href);
    backBtn.setAttribute('aria-label', 'Back to ' + target.label);
    backBtn.setAttribute('title', 'Back to ' + target.label);
  }

  /* Scroll reveal (threshold 0 so tall elements still show) */
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    revealEls.forEach((el, i) => { el.style.transitionDelay = i * 100 + 'ms'; });
    const observer = new IntersectionObserver(
      (entries, obs) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); }
      }),
      { threshold: 0, rootMargin: '0px 0px -30px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  /* UPI copy */
  const upiCopyBtn = document.getElementById('upiCopyBtn');
  const upiId = document.getElementById('upiId');
  if (upiCopyBtn && upiId) {
    upiCopyBtn.addEventListener('click', async () => {
      const text = upiId.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        // Fallback when the Clipboard API is unavailable
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      upiCopyBtn.classList.add('is-copied');
      upiCopyBtn.innerHTML = '<svg class="icon icon-sm"><use href="#icon-check"></use></svg> Copied';
      window.setTimeout(() => {
        upiCopyBtn.classList.remove('is-copied');
        upiCopyBtn.innerHTML = '<svg class="icon icon-sm"><use href="#icon-copy"></use></svg> Copy';
      }, 1800);
    });
  }

  /* PayPal (fixed amount comes from the backend) */
  function displayFixedAmount(amountStr) {
    document.querySelectorAll('[data-amount-display]').forEach((el) => {
      el.textContent = `$${amountStr}`;
    });
  }

  function showStatus(groupName, message, type) {
    const el = document.getElementById(`paypal-status-${groupName}`);
    if (!el) return;
    el.textContent = message;
    el.classList.remove('is-error', 'is-info');
    if (type) el.classList.add(type);
    el.classList.add('is-active');
  }
  function clearStatus(groupName) {
    const el = document.getElementById(`paypal-status-${groupName}`);
    if (!el) return;
    el.classList.remove('is-active', 'is-error', 'is-info');
    el.textContent = '';
  }

  function showThankYou(groupName) {
    const card = document.querySelector(`.region-card--${groupName === 'india' ? 'india' : 'intl'}`);
    document.getElementById(`paypal-button-${groupName}`).style.display = 'none';
    const amountNote = card ? card.querySelector('.fixed-amount-note') : null;
    if (amountNote) amountNote.style.display = 'none';
    document.getElementById(`thankyou-${groupName}`).classList.add('is-visible');
  }

  function loadPayPalSdk(clientId, currency) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}`;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  function renderPayPalButtons(groupName) {
    if (!window.paypal) return;

    window.paypal.Buttons({
      style: { layout: 'horizontal', color: 'gold', shape: 'pill', label: 'paypal', height: 45 },

      createOrder: function () {
        clearStatus(groupName);
        showStatus(groupName, 'Starting your payment…', 'is-info');

        return fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
          .then((res) => res.json())
          .then((body) => {
            if (!body.success) {
              showStatus(groupName, body.message || 'Could not start the payment.', 'is-error');
              throw new Error(body.message || 'create-order failed');
            }
            clearStatus(groupName);
            return body.id;
          });
      },

      onApprove: function (data) {
        showStatus(groupName, 'Confirming your payment…', 'is-info');
        return fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID: data.orderID })
        })
          .then((res) => res.json())
          .then((body) => {
            if (!body.success) {
              showStatus(groupName, body.message || 'Payment could not be completed.', 'is-error');
              return;
            }
            clearStatus(groupName);
            showThankYou(groupName);
          });
      },

      onCancel: function () {
        showStatus(groupName, 'Payment cancelled.', 'is-info');
      },

      onError: function () {
        showStatus(groupName, 'Something went wrong with PayPal. Please try again.', 'is-error');
      }

    }).render(`#paypal-button-${groupName}`);
  }

  fetch('/api/paypal/config')
    .then((res) => res.json())
    .then((body) => {
      if (!body.success) {
        showStatus('india', 'Payments are temporarily unavailable.', 'is-error');
        showStatus('intl', 'Payments are temporarily unavailable.', 'is-error');
        return;
      }
      return loadPayPalSdk(body.clientId, body.currency || 'USD').then(() => {
        if (body.amount) displayFixedAmount(body.amount);
        renderPayPalButtons('india');
        renderPayPalButtons('intl');
      });
    })
    .catch(() => {
      showStatus('india', 'Payments are temporarily unavailable.', 'is-error');
      showStatus('intl', 'Payments are temporarily unavailable.', 'is-error');
    });
})();