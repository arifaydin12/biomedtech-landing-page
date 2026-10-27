/* ==========================================================================
   BioMedTech Solutions (fictional) - landing page behavior
   Vanilla JS, no dependencies. Sections:
   1. Helpers            6. Product tabs
   2. Theme toggle       7. Testimonial carousel
   3. Header & nav       8. FAQ accordion
   4. Scroll reveal      9. Demo form validation
   5. Stat counters
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Helpers ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReducedMotion = function () { return reduceMotionQuery.matches; };
  var hasIO = 'IntersectionObserver' in window;

  function headerHeight() {
    var h = $('#site-header');
    return h ? h.offsetHeight : 72;
  }

  /* ---------- 2. Theme toggle ---------- */
  (function initTheme() {
    var root = document.documentElement;
    var btn = $('#theme-toggle');
    var metaTheme = $('meta[name="theme-color"]');
    if (!btn) return;

    function apply(theme, persist) {
      root.setAttribute('data-theme', theme);
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0a1118' : '#0A4D68');
      if (persist) {
        try { localStorage.setItem('bmt-theme', theme); } catch (e) { /* storage unavailable */ }
      }
    }

    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    btn.addEventListener('click', function () {
      apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  })();

  /* ---------- 3. Header, mobile menu, smooth scroll, active link ---------- */
  var navApi = (function initNav() {
    var header = $('#site-header');
    var nav = $('#primary-nav');
    var toggle = $('#nav-toggle');
    var progress = $('#scroll-progress');
    var toTop = $('#to-top');
    var navLinks = $$('a[data-nav]');
    // The demo section is tracked too, so no menu link stays highlighted while the form is in view
    var sections = navLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .concat([document.getElementById('demo')])
      .filter(Boolean);
    var desktopQuery = window.matchMedia('(min-width: 961px)');

    function setMenu(open, returnFocus) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('menu-open', open);
      if (!open && returnFocus) toggle.focus();
    }
    function isOpen() { return nav.classList.contains('is-open'); }

    toggle.addEventListener('click', function () { setMenu(!isOpen()); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setMenu(false, true);
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    var onBreakpoint = function (e) { if (e.matches) setMenu(false); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onBreakpoint);
    else if (desktopQuery.addListener) desktopQuery.addListener(onBreakpoint);

    /* Smooth scrolling for in-page links (honors reduced motion) */
    function scrollToTarget(target, hash) {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      if (hash && window.history && history.pushState) {
        try { history.pushState(null, '', hash); } catch (e) { /* file:// or sandbox */ }
      }
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var hash = a.getAttribute('href');
      if (hash.length < 2) return;
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      if (isOpen()) setMenu(false);
      document.dispatchEvent(new CustomEvent('bmt:navigate', { detail: { link: a } }));
      scrollToTarget(target, hash);
    });

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        var home = document.getElementById('home');
        if (home) { home.setAttribute('tabindex', '-1'); home.focus({ preventScroll: true }); }
      });
    }

    /* Scroll-driven UI, throttled with requestAnimationFrame */
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var docH = document.documentElement.scrollHeight;
      var maxScroll = Math.max(1, docH - window.innerHeight);

      header.classList.toggle('is-scrolled', y > 8);
      if (progress) progress.style.transform = 'scaleX(' + Math.min(1, y / maxScroll).toFixed(4) + ')';
      if (toTop) {
        var show = y > 700;
        toTop.hidden = false;
        toTop.classList.toggle('is-visible', show);
        toTop.tabIndex = show ? 0 : -1;
        toTop.setAttribute('aria-hidden', String(!show));
      }

      var probe = y + headerHeight() + window.innerHeight * 0.25;
      var current = sections.length ? sections[0].id : '';
      sections.forEach(function (s) { if (s.offsetTop <= probe) current = s.id; });
      if (y + window.innerHeight >= docH - 4 && sections.length) current = sections[sections.length - 1].id;

      navLinks.forEach(function (a) {
        var active = a.getAttribute('href') === '#' + current;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    function requestUpdate() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();

    return { closeMenu: function () { setMenu(false); } };
  })();

  /* ---------- 4. Scroll reveal ---------- */
  (function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;
    if (!hasIO || prefersReducedMotion()) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- 5. Animated stat counters ---------- */
  (function initCounters() {
    var container = $('#stats');
    var numbers = $$('.stat-number');
    if (!container || !numbers.length) return;

    function format(value, decimals) {
      return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    function decimalsOf(el) { return parseInt(el.getAttribute('data-decimals') || '0', 10); }

    // The final value is already in the markup (no-JS / reduced-motion friendly).
    if (!hasIO || prefersReducedMotion()) return;

    numbers.forEach(function (el) { el.textContent = format(0, decimalsOf(el)); });

    function run(el) {
      var target = parseFloat(el.getAttribute('data-target'));
      var decimals = decimalsOf(el);
      var duration = 1800;
      var start = null;
      function frame(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(target * eased, decimals);
        if (t < 1) window.requestAnimationFrame(frame);
        else el.textContent = format(target, decimals);
      }
      window.requestAnimationFrame(frame);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          numbers.forEach(run);
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(container);
  })();

  /* ---------- 6. Product tabs ---------- */
  var tabsApi = (function initTabs() {
    var list = $('#product-tabs');
    if (!list) return null;
    var tabs = $$('[role="tab"]', list);
    var verticalQuery = window.matchMedia('(min-width: 961px)');

    function panelFor(tab) { return document.getElementById(tab.getAttribute('aria-controls')); }

    function select(tab, opts) {
      opts = opts || {};
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        var p = panelFor(t);
        if (p) p.hidden = !selected;
      });
      if (opts.focus) tab.focus();
      // keep the active tab visible in the horizontally scrolling mobile list
      if (!verticalQuery.matches && list.scrollWidth > list.clientWidth) {
        var left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
        list.scrollTo({ left: left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }

    function syncOrientation() {
      list.setAttribute('aria-orientation', verticalQuery.matches ? 'vertical' : 'horizontal');
    }
    syncOrientation();
    if (verticalQuery.addEventListener) verticalQuery.addEventListener('change', syncOrientation);

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        switch (e.key) {
          case 'ArrowRight':
          case 'ArrowDown': next = tabs[(i + 1) % tabs.length]; break;
          case 'ArrowLeft':
          case 'ArrowUp': next = tabs[(i - 1 + tabs.length) % tabs.length]; break;
          case 'Home': next = tabs[0]; break;
          case 'End': next = tabs[tabs.length - 1]; break;
          default: return;
        }
        e.preventDefault();
        select(next, { focus: true });
      });
    });

    // Footer links such as href="#products" data-tab="cardiac"
    document.addEventListener('bmt:navigate', function (e) {
      var link = e.detail && e.detail.link;
      if (link && link.dataset.tab) {
        var tab = document.getElementById('tab-' + link.dataset.tab);
        if (tab) select(tab);
      }
    });

    return { select: select };
  })();

  /* ---------- 7. Testimonial carousel ---------- */
  (function initCarousel() {
    var root = $('#carousel');
    if (!root) return;
    var viewport = $('#carousel-viewport');
    var track = $('#carousel-track');
    var slides = $$('.slide', track);
    var prevBtn = $('#carousel-prev');
    var nextBtn = $('#carousel-next');
    var toggleBtn = $('#carousel-toggle');
    var dotsBox = $('#carousel-dots');
    var AUTOPLAY_MS = 7000;

    var index = 0;
    var perView = 1;
    var timer = null;
    var userPaused = prefersReducedMotion();
    var hovering = false;

    function calcPerView() {
      var w = window.innerWidth;
      return w >= 1100 ? 3 : w >= 700 ? 2 : 1;
    }
    function maxIndex() { return Math.max(0, slides.length - perView); }

    function buildDots() {
      dotsBox.textContent = '';
      for (var i = 0; i <= maxIndex(); i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dot';
        b.setAttribute('aria-label', 'Show testimonial ' + (i + 1) + (perView > 1 ? ' onwards' : ''));
        b.dataset.index = String(i);
        dotsBox.appendChild(b);
      }
    }

    function render(immediate) {
      index = Math.max(0, Math.min(index, maxIndex()));
      root.style.setProperty('--pv', String(perView));
      if (immediate) track.style.transition = 'none';
      track.style.transform = 'translateX(' + (-slides[index].offsetLeft) + 'px)';
      if (immediate) { void track.offsetWidth; track.style.transition = ''; }

      slides.forEach(function (s, i) {
        var visible = i >= index && i < index + perView;
        s.setAttribute('aria-hidden', String(!visible));
      });
      $$('.dot', dotsBox).forEach(function (d, i) {
        if (i === index) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    function go(i) {
      var max = maxIndex();
      index = i > max ? 0 : i < 0 ? max : i; // wrap around
      render();
    }

    function setLive() { track.setAttribute('aria-live', timer ? 'off' : 'polite'); }
    function start() {
      stop();
      if (userPaused || hovering || prefersReducedMotion() || maxIndex() === 0) { setLive(); return; }
      timer = window.setInterval(function () { go(index + 1); }, AUTOPLAY_MS);
      setLive();
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
      setLive();
    }

    function syncToggle() {
      toggleBtn.setAttribute('aria-pressed', String(userPaused));
      toggleBtn.setAttribute('aria-label', userPaused ? 'Start automatic slide rotation' : 'Pause automatic slide rotation');
    }

    prevBtn.addEventListener('click', function () { go(index - 1); start(); });
    nextBtn.addEventListener('click', function () { go(index + 1); start(); });
    dotsBox.addEventListener('click', function (e) {
      var d = e.target.closest ? e.target.closest('.dot') : null;
      if (d) { go(parseInt(d.dataset.index, 10)); start(); }
    });
    toggleBtn.addEventListener('click', function () {
      userPaused = !userPaused;
      syncToggle();
      start();
    });

    root.addEventListener('mouseenter', function () { hovering = true; stop(); });
    root.addEventListener('mouseleave', function () { hovering = false; start(); });
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function () { if (!root.contains(document.activeElement)) start(); });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(index - 1); start(); }
      else if (e.key === 'ArrowRight') { go(index + 1); start(); }
    });

    // Swipe / drag support
    var startX = null;
    var startY = null;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX; startY = e.clientY;
    });
    viewport.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = startY = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { go(index + (dx < 0 ? 1 : -1)); start(); }
    });
    viewport.addEventListener('pointercancel', function () { startX = startY = null; });

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        var pv = calcPerView();
        if (pv !== perView) { perView = pv; buildDots(); }
        render(true);
        start();
      }, 120);
    });

    // Pause when the tab is hidden
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    perView = calcPerView();
    buildDots();
    syncToggle();
    render(true);
    start();
    // Re-measure once fonts / layout settle
    window.addEventListener('load', function () { render(true); });
  })();

  /* ---------- 8. FAQ accordion ---------- */
  (function initAccordion() {
    var root = $('#accordion');
    if (!root) return;
    var items = $$('.acc-item', root);

    function setOpen(item, open) {
      item.classList.toggle('is-open', open);
      $('.acc-trigger', item).setAttribute('aria-expanded', String(open));
    }

    items.forEach(function (item) {
      var btn = $('.acc-trigger', item);
      btn.addEventListener('click', function () {
        var willOpen = btn.getAttribute('aria-expanded') !== 'true';
        items.forEach(function (other) { if (other !== item) setOpen(other, false); });
        setOpen(item, willOpen);
      });
      btn.addEventListener('keydown', function (e) {
        var triggers = items.map(function (it) { return $('.acc-trigger', it); });
        var i = triggers.indexOf(btn);
        var target = null;
        if (e.key === 'ArrowDown') target = triggers[(i + 1) % triggers.length];
        else if (e.key === 'ArrowUp') target = triggers[(i - 1 + triggers.length) % triggers.length];
        else if (e.key === 'Home') target = triggers[0];
        else if (e.key === 'End') target = triggers[triggers.length - 1];
        if (target) { e.preventDefault(); target.focus(); }
      });
    });
  })();

  /* ---------- 9. Demo form (client-side validation only; nothing is sent) ---------- */
  (function initForm() {
    var form = $('#demo-form');
    if (!form) return;
    var alertBox = $('#form-alert');
    var success = $('#form-success');
    var submitBtn = $('#form-submit');
    var counter = $('#f-message-count');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    var rules = {
      name: function (v) {
        v = v.trim();
        if (!v) return 'Please enter your full name.';
        if (v.length < 2) return 'Your name must be at least 2 characters.';
        if (!/[A-Za-z\u00C0-\u024F]/.test(v)) return 'Your name must contain letters.';
        return '';
      },
      email: function (v) {
        v = v.trim();
        if (!v) return 'Please enter your work email.';
        if (!emailRe.test(v)) return 'Enter a valid email address, for example name@hospital.example.';
        return '';
      },
      organization: function (v) {
        return v.trim().length > 100 ? 'Please keep the organization name under 100 characters.' : '';
      },
      interest: function (v) { return v ? '' : 'Please choose a product category.'; },
      message: function (v) {
        v = v.trim();
        if (!v) return 'Please tell us a little about your needs.';
        if (v.length < 10) return 'Your message is too short. Please write at least 10 characters (' + v.length + '/10).';
        return '';
      },
      consent: function (_v, el) { return el.checked ? '' : 'Please confirm that you understand this is a demo form.'; }
    };

    function fieldOf(el) { return el.closest('.field'); }

    function validate(el, showValid) {
      var rule = rules[el.name];
      if (!rule) return true;
      var msg = rule(el.value, el);
      var field = fieldOf(el);
      var errEl = document.getElementById(el.id + '-error');
      field.classList.toggle('has-error', !!msg);
      field.classList.toggle('is-valid', !msg && !!showValid && el.type !== 'checkbox' && !!el.value.trim());
      if (errEl) errEl.textContent = msg;
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      return !msg;
    }

    var controls = $$('input, select, textarea', form);
    controls.forEach(function (el) {
      var touched = false;
      el.addEventListener('blur', function () { touched = true; validate(el, true); });
      var evt = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, function () {
        if (touched || fieldOf(el).classList.contains('has-error')) validate(el, true);
        if (el.name === 'message') updateCounter();
        if (!form.querySelector('.has-error')) alertBox.hidden = true;
      });
      el.addEventListener('change', function () { touched = true; });
    });

    function updateCounter() {
      var field = $('#f-message');
      var n = field.value.length;
      counter.textContent = n + ' / ' + field.maxLength;
      counter.classList.toggle('is-near', n >= field.maxLength - 30);
    }
    updateCounter();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      var invalidCount = 0;
      controls.forEach(function (el) {
        var ok = validate(el, true);
        if (!ok) { invalidCount++; if (!firstInvalid) firstInvalid = el; }
      });

      if (firstInvalid) {
        alertBox.textContent = invalidCount === 1
          ? 'Please fix 1 field before sending your request.'
          : 'Please fix ' + invalidCount + ' fields before sending your request.';
        alertBox.hidden = false;
        firstInvalid.focus();
        return;
      }

      alertBox.hidden = true;
      submitBtn.classList.add('is-loading');
      submitBtn.setAttribute('aria-disabled', 'true');
      $('.btn-label', submitBtn).textContent = 'Validating\u2026';

      // Simulated "send": no network request is made anywhere.
      window.setTimeout(function () {
        $('#success-name').textContent = $('#f-name').value.trim().split(/\s+/)[0] || 'there';
        $('#success-email').textContent = $('#f-email').value.trim();
        form.hidden = true;
        success.hidden = false;
        success.focus();
        submitBtn.classList.remove('is-loading');
        submitBtn.removeAttribute('aria-disabled');
        $('.btn-label', submitBtn).textContent = 'Send request';
      }, prefersReducedMotion() ? 0 : 900);
    });

    $('#form-reset').addEventListener('click', function () {
      form.reset();
      controls.forEach(function (el) {
        fieldOf(el).classList.remove('has-error', 'is-valid');
        el.removeAttribute('aria-invalid');
      });
      $$('.error', form).forEach(function (p) { p.textContent = ''; });
      updateCounter();
      success.hidden = true;
      form.hidden = false;
      $('#f-name').focus();
    });

    // "Request a demo" buttons inside product panels preselect the interest
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-interest]') : null;
      if (!a) return;
      var select = $('#f-interest');
      select.value = a.dataset.interest;
      if (success.hidden === false) $('#form-reset').click();
      validate(select, true);
      // The shared smooth-scroll handler focuses the section; move focus to the first field after the scroll
      window.setTimeout(function () { $('#f-name').focus({ preventScroll: true }); }, prefersReducedMotion() ? 0 : 700);
    });
  })();
})();
