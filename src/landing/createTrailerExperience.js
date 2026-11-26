import { gsap } from 'gsap';

const TRAILER_SOURCE = new URL(
  '../../assets/videos/dyson_completo.mp4',
  import.meta.url,
).href;

function getPlayerRect() {
  const safety = window.innerWidth <= 680 ? 16 : 32;
  const maxWidth = Math.min(window.innerWidth - safety * 2, 1100);
  const maxHeight = Math.max(window.innerHeight - safety * 2, 180);
  const width = Math.min(maxWidth, maxHeight * (16 / 9));
  const height = width * (9 / 16);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

export function createTrailerExperience({ section, modal, page, onOpenChange }) {
  if (!section || !modal) {
    return { setRevealActive: () => {}, destroy: () => {} };
  }

  const previewVideo = section.querySelector('.possibilities-video');
  const trailerButton = section.querySelector('.trailer-cta');
  const triggerContent = trailerButton?.querySelectorAll('span');
  const fallbackButton = section.querySelector('.possibilities-video-start');
  const overlay = modal.querySelector('.trailer-modal__overlay');
  const player = modal.querySelector('.trailer-modal__player');
  const trailerVideo = modal.querySelector('.trailer-modal__video');
  const closeButton = modal.querySelector('.trailer-modal__close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!previewVideo || !trailerButton || !fallbackButton || !overlay || !player || !trailerVideo || !closeButton) {
    return { setRevealActive: () => {}, destroy: () => {} };
  }

  let sectionActive = false;
  let modalOpen = false;
  let animating = false;
  let revealActive = false;
  let previewPlaying = false;
  let scrollPosition = 0;
  let timeline;

  const preventBackgroundScroll = (event) => {
    if (modalOpen) event.preventDefault();
  };

  function setPlayerRect(rect, radius) {
    gsap.set(player, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: radius,
    });
  }

  function lockPage() {
    scrollPosition = window.scrollY;
    page?.setAttribute('inert', '');
    document.body.classList.add('is-trailer-open');
    window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  }

  function unlockPage() {
    window.removeEventListener('wheel', preventBackgroundScroll);
    window.removeEventListener('touchmove', preventBackgroundScroll);
    document.body.classList.remove('is-trailer-open');
    page?.removeAttribute('inert');
    if (Math.abs(window.scrollY - scrollPosition) > 1) {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    }
  }

  function showPlaybackFallback() {
    fallbackButton.hidden = false;
  }

  async function playPreview({ restart = false } = {}) {
    if (!sectionActive || !revealActive || modalOpen || document.hidden || previewPlaying) return;
    try {
      if (restart) previewVideo.currentTime = 0;
      await previewVideo.play();
      if (!sectionActive || !revealActive || modalOpen || document.hidden) {
        previewVideo.pause();
        previewPlaying = false;
        return;
      }
      previewPlaying = true;
      fallbackButton.hidden = true;
    } catch {
      showPlaybackFallback();
    }
  }

  function pausePreview() {
    previewVideo.pause();
    previewPlaying = false;
  }

  function setRevealActive(nextActive) {
    if (nextActive === revealActive) return;
    revealActive = nextActive;
    if (revealActive) playPreview({ restart: true });
    else {
      pausePreview();
      fallbackButton.hidden = true;
    }
  }

  function finishOpen() {
    animating = false;
    trailerVideo.controls = true;
    closeButton.focus({ preventScroll: true });
    trailerVideo.muted = false;
    trailerVideo.play().catch(() => {});
  }

  function openModal() {
    if (modalOpen || animating) return;
    modalOpen = true;
    animating = true;
    pausePreview();
    if (!trailerVideo.src) trailerVideo.src = TRAILER_SOURCE;

    const origin = trailerButton.getBoundingClientRect();
    const destination = getPlayerRect();
    modal.hidden = false;
    onOpenChange?.(true);
    lockPage();
    trailerVideo.currentTime = 0;
    trailerVideo.controls = false;
    setPlayerRect(origin, getComputedStyle(trailerButton).borderRadius || '10px');
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(trailerVideo, { autoAlpha: 0 });
    gsap.set(closeButton, { autoAlpha: 0, scale: 0.85 });

    timeline?.kill();
    if (reducedMotion.matches) {
      setPlayerRect(destination, '18px');
      gsap.set([overlay, trailerVideo, closeButton], { autoAlpha: 1 });
      gsap.set(closeButton, { scale: 1 });
      gsap.set(triggerContent, { autoAlpha: 0 });
      finishOpen();
      return;
    }

    timeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finishOpen });
    timeline
      .to(triggerContent, { autoAlpha: 0, duration: 0.16 }, 0)
      .to(overlay, { autoAlpha: 1, duration: 0.58 }, 0)
      .to(player, {
        left: destination.left,
        top: destination.top,
        width: destination.width,
        height: destination.height,
        borderRadius: 18,
        duration: 0.7,
      }, 0)
      .to(trailerVideo, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' }, 0.5)
      .to(closeButton, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power2.out' }, 0.52);
  }

  function finishClose() {
    modal.hidden = true;
    onOpenChange?.(false);
    modalOpen = false;
    animating = false;
    unlockPage();
    gsap.set(triggerContent, { clearProps: 'opacity,visibility' });
    gsap.set([player, overlay, trailerVideo, closeButton], { clearProps: 'all' });
    trailerButton.focus({ preventScroll: true });
    playPreview();
  }

  function closeModal() {
    if (!modalOpen || animating) return;
    animating = true;
    trailerVideo.pause();
    trailerVideo.controls = false;
    const destination = trailerButton.getBoundingClientRect();

    timeline?.kill();
    if (reducedMotion.matches) {
      finishClose();
      return;
    }

    timeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finishClose });
    timeline
      .to([trailerVideo, closeButton], { autoAlpha: 0, duration: 0.16 }, 0)
      .to(player, {
        left: destination.left,
        top: destination.top,
        width: destination.width,
        height: destination.height,
        borderRadius: getComputedStyle(trailerButton).borderRadius || '10px',
        duration: 0.68,
      }, 0.04)
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.12)
      .to(triggerContent, { autoAlpha: 1, duration: 0.16 }, 0.54);
  }

  function handleKeydown(event) {
    if (!modalOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') {
      const scrollKeys = ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '];
      if (scrollKeys.includes(event.key) && event.target !== trailerVideo) event.preventDefault();
      return;
    }
    const focusable = [trailerVideo, closeButton];
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

  function handleVisibilityChange() {
    if (document.hidden) {
      pausePreview();
      trailerVideo.pause();
    } else if (modalOpen && !animating) {
      trailerVideo.play().catch(() => {});
    } else {
      playPreview();
    }
  }

  function handleResize() {
    if (!modalOpen || animating) return;
    setPlayerRect(getPlayerRect(), '18px');
  }

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    sectionActive = entry.isIntersecting;
    if (sectionActive) playPreview();
    else pausePreview();
  }, { rootMargin: '50% 0px' });
  visibilityObserver.observe(section);

  trailerButton.addEventListener('click', openModal);
  fallbackButton.addEventListener('click', playPreview);
  closeButton.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('resize', handleResize);

  return {
    setRevealActive,
    destroy() {
      timeline?.kill();
      visibilityObserver.disconnect();
      trailerButton.removeEventListener('click', openModal);
      fallbackButton.removeEventListener('click', playPreview);
      closeButton.removeEventListener('click', closeModal);
      overlay.removeEventListener('click', closeModal);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      previewVideo.pause();
      trailerVideo.pause();
      if (modalOpen) {
        modal.hidden = true;
        onOpenChange?.(false);
        modalOpen = false;
        animating = false;
        unlockPage();
      }
    },
  };
}
