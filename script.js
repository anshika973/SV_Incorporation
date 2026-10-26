(() => {
  'use strict';

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = (message) => {
    const node = qs('.toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(node._toastTimer);
    node._toastTimer = window.setTimeout(() => node.classList.remove('show'), 3400);
  };

  // Shared header interactions and footer year.
  qsa('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
  const navToggle = qs('.nav-toggle');
  const nav = qs('#site-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      navToggle.textContent = isOpen ? '×' : '☰';
    });
    qsa('a', nav).forEach((link) => link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation');
      navToggle.textContent = '☰';
    }));
  }

  // Accessible four-image homepage hero slider.
  const heroSlider = qs('#home-hero');
  if (heroSlider) {
    const slides = qsa('.hero-slide', heroSlider);
    const dots = qsa('.hero-dot', heroSlider);
    const currentLabel = qs('#hero-slide-current', heroSlider);
    const progress = qs('#hero-progress-bar', heroSlider);
    const previous = qs('.hero-slider-prev', heroSlider);
    const next = qs('.hero-slider-next', heroSlider);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let timer = null;
    const intervalMs = 6200;
    const render = (index, restart = true) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const active = i === activeIndex;
        slide.classList.toggle('active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach((dot, i) => {
        const active = i === activeIndex;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-pressed', String(active));
      });
      if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, '0');
      if (progress) {
        progress.classList.remove('run');
        progress.style.animation = 'none';
        void progress.offsetWidth;
        progress.style.animation = '';
        if (!reducedMotion) progress.classList.add('run');
      }
      if (restart) startTimer();
    };
    const stopTimer = () => { if (timer) window.clearInterval(timer); timer = null; };
    const startTimer = () => {
      stopTimer();
      if (!reducedMotion && !document.hidden) timer = window.setInterval(() => render(activeIndex + 1, false), intervalMs);
    };
    if (previous) previous.addEventListener('click', () => render(activeIndex - 1));
    if (next) next.addEventListener('click', () => render(activeIndex + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => render(i)));
    heroSlider.addEventListener('mouseenter', stopTimer);
    heroSlider.addEventListener('mouseleave', startTimer);
    heroSlider.addEventListener('focusin', stopTimer);
    heroSlider.addEventListener('focusout', startTimer);
    document.addEventListener('visibilitychange', () => document.hidden ? stopTimer() : startTimer());
    render(0, false); startTimer();
  }

  // Card favourites are client-side visual bookmarks only.
  qsa('.favorite').forEach((button) => {
    button.addEventListener('click', () => {
      const saved = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? '♥' : '♡';
      button.setAttribute('aria-label', `${saved ? 'Remove saved' : 'Save'} ${button.getAttribute('aria-label').replace(/^(Save|Remove saved) /, '')}`);
      toast(saved ? 'Saved for this visit.' : 'Removed from saved options.');
    });
  });

  // Homepage search forwards visitor choices to the properties page.
  const homeSearch = qs('#home-search');
  if (homeSearch) {
    homeSearch.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = new FormData(homeSearch);
      const params = new URLSearchParams();
      ['location', 'type', 'bhk'].forEach((key) => {
        const value = String(values.get(key) || '').trim();
        if (value) params.set(key, value);
      });
      const purpose = String(values.get('purpose') || '').trim();
      if (purpose === 'investment') {
        window.location.href = `investment.html${params.toString() ? `?${params.toString()}` : ''}`;
        return;
      }
      window.location.href = `properties.html${params.toString() ? `?${params.toString()}` : ''}`;
    });
  }

  // Filterable property listing, prefilled from location cards and homepage search.
  const propertyGrid = qs('#properties-grid');
  if (propertyGrid) {
    const searchInput = qs('#property-search');
    const locationSelect = qs('#filter-location');
    const typeSelect = qs('#filter-type');
    const count = qs('#results-count');
    const empty = qs('#empty-state');
    const cards = qsa('.property-card', propertyGrid);
    const params = new URLSearchParams(window.location.search);
    const knownLocations = ['navi-mumbai', 'mumbai', 'thane', 'pune', 'lucknow'];
    if (locationSelect && knownLocations.includes(params.get('location'))) locationSelect.value = params.get('location');
    if (typeSelect && ['residential', 'commercial', 'land'].includes(params.get('type'))) typeSelect.value = params.get('type');
    if (searchInput && params.get('search')) searchInput.value = params.get('search');

    const applyFilters = () => {
      const term = (searchInput?.value || '').trim().toLowerCase();
      const location = locationSelect?.value || '';
      const type = typeSelect?.value || '';
      let visible = 0;
      cards.forEach((card) => {
        const searchText = `${card.dataset.search || ''} ${card.innerText || ''}`.toLowerCase();
        const match = (!term || searchText.includes(term)) && (!location || card.dataset.location === location) && (!type || card.dataset.type === type);
        card.hidden = !match;
        if (match) visible += 1;
      });
      if (count) {
        const config = params.get('bhk');
        count.textContent = visible
          ? `${visible} ${visible === 1 ? 'option' : 'options'} to explore${config ? ` · You selected ${config}; confirm matching configuration with our team.` : ''}.`
          : 'No options match these filters.';
      }
      if (empty) empty.classList.toggle('show', visible === 0);
    };
    [searchInput, locationSelect, typeSelect].forEach((control) => {
      if (control) control.addEventListener(control === searchInput ? 'input' : 'change', applyFilters);
    });
    const reset = qs('#reset-filters');
    if (reset) reset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (locationSelect) locationSelect.value = '';
      if (typeSelect) typeSelect.value = '';
      params.delete('location'); params.delete('type'); params.delete('bhk'); params.delete('search');
      applyFilters();
    });
    applyFilters();
  }

  // Partner logo carousel: auto-advancing, manual controls and responsive sizing.
  const track = qs('#partner-track');
  const viewport = qs('.partner-viewport');
  if (track && viewport) {
    const originalSlides = [...track.children];
    const originalCount = originalSlides.length;
    originalSlides.forEach((slide) => {
      const clone = slide.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      qsa('img', clone).forEach((img) => img.alt = '');
      track.appendChild(clone);
    });
    let index = 0;
    let timer = 0;
    const getStep = () => {
      const slide = track.querySelector('.partner-slide');
      if (!slide) return 0;
      const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
      return slide.getBoundingClientRect().width + gap;
    };
    const visibleCount = () => window.innerWidth <= 780 ? 2 : (window.innerWidth <= 1050 ? 3 : 5);
    const updatePosition = (animate = true) => {
      track.style.transition = animate ? 'transform .55s ease' : 'none';
      track.style.transform = `translateX(${-index * getStep()}px)`;
    };
    const move = (direction) => {
      index += direction;
      updatePosition(true);
      if (index >= originalCount) {
        window.setTimeout(() => { index = 0; updatePosition(false); }, 570);
      } else if (index < 0) {
        index = originalCount - 1;
        updatePosition(false);
      }
    };
    const prev = qs('.partner-prev');
    const next = qs('.partner-next');
    if (prev) prev.addEventListener('click', () => { move(-1); restartTimer(); });
    if (next) next.addEventListener('click', () => { move(1); restartTimer(); });
    const restartTimer = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => move(1), 3400);
    };
    viewport.addEventListener('mouseenter', () => window.clearInterval(timer));
    viewport.addEventListener('mouseleave', restartTimer);
    window.addEventListener('resize', () => updatePosition(false));
    updatePosition(false);
    restartTimer();
  }

  // Contact form opens a prefilled email so the visitor can review before sending.
  const contactForm = qs('#contact-form');
  if (contactForm) {
    const params = new URLSearchParams(window.location.search);
    const requestedInterest = params.get('interest');
    const message = qs('#message', contactForm);
    if (requestedInterest && message && !message.value) {
      message.value = `I am interested in: ${requestedInterest.replace(/\+/g, ' ')}.\n\nPlease contact me to discuss available options.`;
    }
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      const fields = new FormData(contactForm);
      const body = [
        'New enquiry for SV Incorporation',
        '',
        `Name: ${fields.get('name') || ''}`,
        `Phone: ${fields.get('phone') || ''}`,
        `Email: ${fields.get('email') || ''}`,
        `Interest: ${fields.get('interest') || ''}`,
        `Preferred location: ${fields.get('location') || ''}`,
        `Property type: ${fields.get('type') || ''}`,
        '',
        'Requirements:',
        fields.get('message') || 'Not provided'
      ].join('\n');
      const subject = `Property enquiry — ${fields.get('name') || 'Website visitor'}`;
      toast('Opening your email app. Review the details before sending.');
      window.location.href = `mailto:admin@svincorporation.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  // Newsletter uses the visitor's mail app; no backend or silent subscription.
  qsa('[data-newsletter]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = qs('input[type="email"]', form);
      if (!input || !input.reportValidity()) return;
      const subject = 'Subscribe me to SV Incorporation updates';
      const body = `Please add this email address to property updates (subject to your subscription preferences): ${input.value}`;
      window.location.href = `mailto:admin@svincorporation.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast('Opening your email app to request updates.');
      form.reset();
    });
  });
})();
