import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function createPossibilitiesMotion({
  section,
  nextSection,
  modelBoundarySection = section,
  setModelOpacity,
  setInteractionEnabled,
  onVideoRevealChange,
}) {
  if (!section) return () => {};

  const stage = section.querySelector('.possibilities-stage');
  const video = section.querySelector('.possibilities-video');
  const trailerButton = section.querySelector('.trailer-cta');
  const logoCore = section.querySelector('.possibilities-logo-core');
  const logo = section.querySelector('.possibilities-logo');
  const submark = section.querySelector('.possibilities-submark');
  const leftCopy = section.querySelector('.possibilities-side--left');
  const rightCopy = section.querySelector('.possibilities-side--right');
  const scrollCue = section.querySelector('.possibilities-scroll-cue');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let typographyTimeline;
  let zoomTimeline;
  let modelBoundaryTrigger;
  let resizeTimer;
  let stageSize = '';
  let videoRevealActive = false;

  function updateVideoReveal(progress, force = false) {
    let next = videoRevealActive;
    if (progress >= 0.86) next = true;
    if (progress <= 0.8) next = false;
    if (!force && next === videoRevealActive) return;
    videoRevealActive = next;
    onVideoRevealChange?.(next);
  }

  function keepModelInPreviousSection() {
    modelBoundaryTrigger?.kill();
    modelBoundaryTrigger = ScrollTrigger.create({
      id: 'possibilities-model-boundary',
      trigger: modelBoundarySection,
      start: 'top top',
      onEnter: () => {
        setModelOpacity?.(0);
        setInteractionEnabled?.(false);
      },
      onLeaveBack: () => {
        setModelOpacity?.(1);
      },
    });
  }

  function getMotionOffsets() {
    const stageRect = stage.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const leftRect = leftCopy.getBoundingClientRect();
    const rightRect = rightCopy.getBoundingClientRect();
    const gap = Math.max(8, Math.min(36, stageRect.width * 0.022));
    const offscreenGap = Math.max(24, stageRect.width * 0.025);

    return {
      initial: {
        left: stageRect.left - offscreenGap - leftRect.right,
        right: stageRect.right + offscreenGap - rightRect.left,
      },
      final: {
        left: logoRect.left - gap - leftRect.right,
        right: logoRect.right + gap - rightRect.left,
      },
    };
  }

  function getZoomTransform() {
    const stageRect = stage.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = logoCore.dataset.logoViewbox
      .split(' ')
      .map(Number);
    const [focusX, focusY] = logoCore.dataset.logoZoomPoint.split(' ').map(Number);
    const solidRadius = Number(logoCore.dataset.logoSolidRadius);
    const focusScreenX = logoRect.left + ((focusX - viewBoxX) / viewBoxWidth) * logoRect.width;
    const focusScreenY = logoRect.top + ((focusY - viewBoxY) / viewBoxHeight) * logoRect.height;
    const solidRadiusPixels = Math.max((solidRadius / viewBoxWidth) * logoRect.width, 1);
    const stageRadiusX = stageRect.width / 2;
    const stageRadiusY = stageRect.height / 2;
    const scale = Math.hypot(
      stageRadiusX / solidRadiusPixels,
      stageRadiusY / solidRadiusPixels,
    ) * 1.1;

    return {
      x: stageRect.left + stageRadiusX - focusScreenX,
      y: stageRect.top + stageRadiusY - focusScreenY,
      scale,
      originX: ((focusX - viewBoxX) / viewBoxWidth) * 100,
      originY: ((focusY - viewBoxY) / viewBoxHeight) * 100,
    };
  }

  function buildTimelines(typographyProgress = 0, zoomProgress = 0) {
    stageSize = `${stage.clientWidth}x${stage.clientHeight}`;
    typographyTimeline?.scrollTrigger?.kill();
    typographyTimeline?.kill();
    zoomTimeline?.scrollTrigger?.kill();
    zoomTimeline?.kill();
    gsap.set([leftCopy, rightCopy], { clearProps: 'transform' });
    gsap.set([leftCopy, rightCopy, submark, scrollCue], { clearProps: 'opacity,visibility' });
    gsap.set(logoCore, { clearProps: 'transform,transform-origin' });
    gsap.set(video, { autoAlpha: 0 });
    gsap.set(trailerButton, {
      autoAlpha: 0,
      pointerEvents: 'none',
      y: 16,
      xPercent: -50,
    });

    const offsets = getMotionOffsets();

    if (reducedMotion.matches) {
      gsap.set([leftCopy, rightCopy, submark, logoCore, scrollCue], { autoAlpha: 0 });
      gsap.set(video, { autoAlpha: 1 });
      gsap.set(trailerButton, {
        autoAlpha: 1,
        pointerEvents: 'auto',
        y: 0,
        xPercent: -50,
      });
      updateVideoReveal(1, true);
      return;
    }

    gsap.set(leftCopy, { x: offsets.initial.left });
    gsap.set(rightCopy, { x: offsets.initial.right });

    typographyTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'possibilities-typography',
        trigger: section,
        start: 'top top',
        end: () => `+=${stage.clientHeight}`,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    typographyTimeline
      .to(leftCopy, { x: offsets.final.left, duration: 1 }, 0)
      .to(rightCopy, { x: offsets.final.right, duration: 1 }, 0);

    typographyTimeline.progress(typographyProgress);

    const zoom = getZoomTransform();
    const compositionHoldDistance = stage.clientHeight * 0.25;
    gsap.set(logoCore, { transformOrigin: `${zoom.originX}% ${zoom.originY}%` });

    zoomTimeline = gsap.timeline({
      scrollTrigger: {
        id: 'possibilities-logo-zoom',
        trigger: section,
        start: () => `top+=${stage.clientHeight + compositionHoldDistance} top`,
        endTrigger: nextSection,
        end: 'top bottom',
        scrub: 1.1,
        invalidateOnRefresh: true,
        onUpdate: (self) => updateVideoReveal(self.progress),
      },
    });

    zoomTimeline
      .to([leftCopy, rightCopy, submark, scrollCue], {
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power2.out',
      }, 0)
      .to(logoCore, {
        x: zoom.x,
        y: zoom.y,
        scale: zoom.scale,
        duration: 0.72,
        ease: 'power2.inOut',
      }, 0.18)
      .to(video, {
        autoAlpha: 1,
        duration: 0.14,
        ease: 'power2.out',
      }, 0.88)
      .to(trailerButton, {
        autoAlpha: 1,
        pointerEvents: 'auto',
        y: 0,
        duration: 0.1,
        ease: 'power2.out',
      }, 0.94);

    zoomTimeline.progress(zoomProgress);
    updateVideoReveal(zoomProgress, true);
  }

  function handleResize() {
    if (stageSize === `${stage.clientWidth}x${stage.clientHeight}`) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const typographyProgress = typographyTimeline?.progress() ?? 0;
      const zoomProgress = zoomTimeline?.progress() ?? 0;
      buildTimelines(typographyProgress, zoomProgress);
      ScrollTrigger.refresh();
    }, 180);
  }

  function handleMotionPreference() {
    buildTimelines(reducedMotion.matches ? 1 : 0, 0);
    ScrollTrigger.refresh();
  }

  buildTimelines();
  keepModelInPreviousSection();
  window.addEventListener('resize', handleResize);
  reducedMotion.addEventListener('change', handleMotionPreference);

  return () => {
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    typographyTimeline?.scrollTrigger?.kill();
    typographyTimeline?.kill();
    zoomTimeline?.scrollTrigger?.kill();
    zoomTimeline?.kill();
    modelBoundaryTrigger?.kill();
    updateVideoReveal(0, true);
  };
}
