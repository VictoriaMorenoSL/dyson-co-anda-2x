import { gsap } from 'gsap';

export function createNavigationMenu({ toggle, menu, page }) {
  if (!toggle || !menu) return () => {};

  const header = toggle.closest('.site-header');
  const panel = menu.querySelector('.navigation-menu__panel');
  const closeButton = menu.querySelector('.navigation-menu__close');
  const links = [...menu.querySelectorAll('.navigation-menu__nav a')];
  const topline = menu.querySelector('.navigation-menu__topline p');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let open = false;
  let animating = false;
  let pendingTarget = null;
  let scrollPosition = 0;
  let timeline;

  const preventBackgroundScroll = (event) => {
    if (!open) return;
    const canScrollMenu = panel.contains(event.target) && panel.scrollHeight > panel.clientHeight;
    if (!canScrollMenu) event.preventDefault();
  };

  function lockPage() {
    scrollPosition = window.scrollY;
    page?.setAttribute('inert', '');
    window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  }

  function unlockPage() {
    window.removeEventListener('wheel', preventBackgroundScroll);
    window.removeEventListener('touchmove', preventBackgroundScroll);
    page?.removeAttribute('inert');
    if (Math.abs(window.scrollY - scrollPosition) > 1) {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    }
  }

  function updateToggle(expanded) {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
  }

  function navigateToPendingTarget() {
    if (!pendingTarget) return;
    const target = document.querySelector(pendingTarget);
    pendingTarget = null;
    target?.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  function finishOpen() {
    animating = false;
    closeButton.focus({ preventScroll: true });
  }

  function finishClose() {
    menu.hidden = true;
    open = false;
    animating = false;
    unlockPage();
    updateToggle(false);
    gsap.set([panel, links, topline], { clearProps: 'all' });
    toggle.focus({ preventScroll: true });
    navigateToPendingTarget();
  }

  function openMenu() {
    if (open || animating) return;
    open = true;
    animating = true;
    menu.hidden = false;
    lockPage();
    updateToggle(true);

    timeline?.kill();
    if (reducedMotion.matches) {
      gsap.set(panel, { xPercent: 0 });
      gsap.set([links, topline], { autoAlpha: 1, y: 0 });
      finishOpen();
      return;
    }

    gsap.set(panel, { xPercent: 100 });
    gsap.set(links, { autoAlpha: 0, y: 30 });
    gsap.set(topline, { autoAlpha: 0, y: 14 });
    timeline = gsap.timeline({ onComplete: finishOpen });
    timeline
      .to(panel, { xPercent: 0, duration: 0.62, ease: 'power3.inOut' }, 0)
      .to(topline, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' }, 0.2)
      .to(links, {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.065,
        ease: 'power2.out',
      }, 0.25);
  }

  function closeMenu({ target = null } = {}) {
    if (!open || animating) return;
    pendingTarget = target;
    animating = true;
    timeline?.kill();

    if (reducedMotion.matches) {
      finishClose();
      return;
    }

    timeline = gsap.timeline({ onComplete: finishClose });
    timeline
      .to([links, topline], {
        autoAlpha: 0,
        y: -14,
        duration: 0.22,
        stagger: 0.025,
        ease: 'power2.in',
      }, 0)
      .to(panel, { xPercent: 100, duration: 0.52, ease: 'power3.inOut' }, 0.08);
  }

  function handleToggle() {
    if (open) closeMenu();
    else openMenu();
  }

  function handleCloseClick() {
    closeMenu();
  }

  function handleLinkClick(event) {
    const href = event.currentTarget.getAttribute('href');
    event.preventDefault();
    closeMenu({ target: href });
  }

  function handleKeydown(event) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') {
      const scrollKeys = ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '];
      if (scrollKeys.includes(event.key)) event.preventDefault();
      return;
    }

    const focusable = [closeButton, ...links];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleHeaderLink(event) {
    const href = event.currentTarget.getAttribute('href');
    const target = document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }

  const headerLinks = [...document.querySelectorAll('.site-header a[href^="#"]')];
  const syncHeaderSize = () => header?.classList.toggle('is-compact', window.scrollY > 8);
  syncHeaderSize();
  window.addEventListener('scroll', syncHeaderSize, { passive: true });
  toggle.addEventListener('click', handleToggle);
  closeButton.addEventListener('click', handleCloseClick);
  links.forEach((link) => link.addEventListener('click', handleLinkClick));
  headerLinks.forEach((link) => link.addEventListener('click', handleHeaderLink));
  document.addEventListener('keydown', handleKeydown);

  return () => {
    timeline?.kill();
    window.removeEventListener('scroll', syncHeaderSize);
    toggle.removeEventListener('click', handleToggle);
    closeButton.removeEventListener('click', handleCloseClick);
    links.forEach((link) => link.removeEventListener('click', handleLinkClick));
    headerLinks.forEach((link) => link.removeEventListener('click', handleHeaderLink));
    document.removeEventListener('keydown', handleKeydown);
    if (open) {
      menu.hidden = true;
      open = false;
      animating = false;
      unlockPage();
      updateToggle(false);
    }
  };
}
