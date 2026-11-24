import { gsap } from 'gsap';

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

export function createTechnologyVideo({
  section,
  modal,
  page,
  setInteractionEnabled,
  isInteractionEnabled,
}) {
  if (!section || !modal) return () => {};

  const trigger = section.querySelector('.feel-air__technology-cta');
  const triggerContent = trigger?.querySelectorAll('span');
  const overlay = modal.querySelector('.technology-modal__overlay');
  const player = modal.querySelector('.technology-modal__player');
  const video = modal.querySelector('.technology-modal__video');
  const closeButton = modal.querySelector('.technology-modal__close');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!trigger || !overlay || !player || !video || !closeButton) return () => {};

  let open = false;
  let animating = false;
  let scrollPosition = 0;
  let interactionWasEnabled = false;
  let timeline;

  const preventBackgroundScroll = (event) => {
    if (open) event.preventDefault();
  };

  const setPlayerRect = (rect, radius) => {
    gsap.set(player, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      borderRadius: radius,
    });
  };

  const lockPage = () => {
    scrollPosition = window.scrollY;
    page?.setAttribute('inert', '');
    window.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
  };

  const unlockPage = () => {
    window.removeEventListener('wheel', preventBackgroundScroll);
    window.removeEventListener('touchmove', preventBackgroundScroll);
    page?.removeAttribute('inert');
    if (Math.abs(window.scrollY - scrollPosition) > 1) {
      window.scrollTo({ top: scrollPosition, behavior: 'instant' });
    }
  };

  const finishOpen = () => {
    animating = false;
    video.controls = true;
    closeButton.focus({ preventScroll: true });
    video.play().catch(() => {});
  };

  const openModal = () => {
    if (open || animating) return;
    open = true;
    animating = true;
    interactionWasEnabled = Boolean(isInteractionEnabled?.());
    setInteractionEnabled?.(false);

    const origin = trigger.getBoundingClientRect();
    const destination = getPlayerRect();
    modal.hidden = false;
    lockPage();
    video.currentTime = 0;
    video.controls = false;
    setPlayerRect(origin, getComputedStyle(trigger).borderRadius || '10px');
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(video, { autoAlpha: 0 });
    gsap.set(closeButton, { autoAlpha: 0, scale: 0.85 });

    timeline?.kill();
    if (reducedMotion.matches) {
      setPlayerRect(destination, '18px');
      gsap.set([overlay, video, closeButton], { autoAlpha: 1 });
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
      .to(video, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' }, 0.5)
      .to(closeButton, { autoAlpha: 1, scale: 1, duration: 0.2, ease: 'power2.out' }, 0.52);
  };

  const finishClose = () => {
    modal.hidden = true;
    open = false;
    animating = false;
    unlockPage();
    setInteractionEnabled?.(interactionWasEnabled);
    gsap.set(triggerContent, { clearProps: 'opacity,visibility' });
    gsap.set([player, overlay, video, closeButton], { clearProps: 'all' });
    trigger.focus({ preventScroll: true });
  };

  const closeModal = () => {
    if (!open || animating) return;
    animating = true;
    video.pause();
    video.controls = false;
    const destination = trigger.getBoundingClientRect();

    timeline?.kill();
    if (reducedMotion.matches) {
      finishClose();
      return;
    }

    timeline = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: finishClose });
    timeline
      .to([video, closeButton], { autoAlpha: 0, duration: 0.16 }, 0)
      .to(player, {
        left: destination.left,
        top: destination.top,
        width: destination.width,
        height: destination.height,
        borderRadius: getComputedStyle(trigger).borderRadius || '10px',
        duration: 0.68,
      }, 0.04)
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.12)
      .to(triggerContent, { autoAlpha: 1, duration: 0.16 }, 0.54);
  };

  const handleKeydown = (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') {
      const scrollKeys = ['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '];
      if (scrollKeys.includes(event.key) && event.target !== video) event.preventDefault();
      return;
    }

    const focusable = [video, closeButton];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleResize = () => {
    if (!open || animating) return;
    setPlayerRect(getPlayerRect(), '18px');
  };

  trigger.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);

  return () => {
    timeline?.kill();
    video.pause();
    trigger.removeEventListener('click', openModal);
    closeButton.removeEventListener('click', closeModal);
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
    if (open) finishClose();
  };
}
