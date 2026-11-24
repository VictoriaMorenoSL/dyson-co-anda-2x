import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const START_LAYOUTS = {
  desktop: {
    air: [[0.1, 0.28], [0.51, 0.28], [0.91, 0.28]],
    becomes: [[0.09, 0.54], [0.23, 0.54], [0.37, 0.54], [0.5, 0.54], [0.64, 0.54], [0.78, 0.54], [0.91, 0.54]],
    style: [[0.1, 0.77], [0.31, 0.77], [0.5, 0.77], [0.7, 0.77], [0.9, 0.77]],
  },
  mobile: {
    air: [[0.08, 0.16], [0.48, 0.16], [0.86, 0.16]],
    becomes: [[0.07, 0.43], [0.21, 0.43], [0.35, 0.43], [0.49, 0.43], [0.63, 0.43], [0.77, 0.43], [0.9, 0.43]],
    style: [[0.08, 0.68], [0.28, 0.68], [0.49, 0.68], [0.7, 0.68], [0.9, 0.68]],
  },
};

export function getHeroProductPose(viewportWidth = window.innerWidth) {
  const isMobile = viewportWidth <= 680;
  if (isMobile) {
    return {
      initial: { x: 0.1, y: -0.25, zRotation: -0.66, scale: 1.02 },
      final: { x: 0.35, y: 0.08, zRotation: -0.8, scale: 0.95 },
    };
  }
  return {
    initial: { x: -0.5, y: 0.06, zRotation: -0.75, scale: 1.05 },
    final: { x: 0.2, y: 0.16, zRotation: -0.86, scale: 1.04 },
  };
}

function setProductPose(group, pose) {
  group.position.set(pose.x, pose.y, 0);
  group.rotation.set(0, 0, pose.zRotation);
  group.scale.setScalar(pose.scale);
}

export function createHeroMotion({
  stage,
  visualGroup,
  setModelOpacity,
  setInteractionEnabled,
}) {
  const root = document.documentElement;
  const atmosphere = stage.querySelector('.hero-atmosphere');
  const header = stage.querySelector('.site-header');
  const intro = stage.querySelector('.hero-intro');
  const scrollCue = stage.querySelector('.scroll-cue');
  const interactionCue = stage.querySelector('.interaction-cue');
  const becomes = stage.querySelector('.word-becomes');
  const letters = [...stage.querySelectorAll('.hero-letter')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const modelFade = { value: 0 };
  let timeline;
  let resizeTimer;
  let interactionActive = false;
  let viewportWidth = window.innerWidth;

  function updateInteraction(enabled) {
    if (interactionActive === enabled) return;
    interactionActive = enabled;
    setInteractionEnabled(enabled);
  }

  function resetAnimatedElements() {
    gsap.set([atmosphere, header, intro, scrollCue, interactionCue, becomes, stage], {
      clearProps: 'all',
    });
    gsap.set(letters, { clearProps: 'transform' });
  }

  function placeLettersAtStart(isMobile) {
    const layout = isMobile ? START_LAYOUTS.mobile : START_LAYOUTS.desktop;
    const stageRect = stage.getBoundingClientRect();

    letters.forEach((letter) => {
      const word = letter.closest('[data-word]').dataset.word;
      const index = Number(letter.dataset.letterIndex);
      const [xRatio, yRatio] = layout[word][index];
      const finalRect = letter.getBoundingClientRect();
      const targetX = stageRect.left + stageRect.width * xRatio;
      const targetY = stageRect.top + stageRect.height * yRatio;
      gsap.set(letter, {
        x: targetX - finalRect.left - finalRect.width / 2,
        y: targetY - finalRect.top - finalRect.height / 2,
      });
    });
  }

  function showFinalState() {
    const { final } = getHeroProductPose();
    resetAnimatedElements();
    setProductPose(visualGroup, final);
    modelFade.value = 1;
    setModelOpacity(1);
    updateInteraction(true);
    gsap.set(atmosphere, { opacity: 1 });
    gsap.set(stage, { backgroundColor: '#080708' });
    gsap.set(becomes, { color: '#ffffff' });
    gsap.set(header, { color: '#292929', backgroundColor: '#e6d9d4' });
    gsap.set(intro, { autoAlpha: 1, y: 0 });
    gsap.set(scrollCue, { autoAlpha: 0 });
    gsap.set(interactionCue, { autoAlpha: 1, y: 0 });
    root.classList.add('motion-ready');
  }

  function buildTimeline(progress = 0) {
    timeline?.scrollTrigger?.kill();
    timeline?.kill();
    resetAnimatedElements();

    if (reducedMotion.matches) {
      showFinalState();
      return;
    }

    const isMobile = window.matchMedia('(max-width: 680px)').matches;
    const poses = getHeroProductPose();
    placeLettersAtStart(isMobile);
    setProductPose(visualGroup, poses.initial);
    modelFade.value = 0;
    setModelOpacity(0);
    updateInteraction(false);
    gsap.set(intro, { autoAlpha: 0, y: 22 });
    gsap.set(interactionCue, { autoAlpha: 0, y: 10 });
    root.classList.add('motion-ready');

    timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        id: 'dyson-hero',
        trigger: stage.parentElement,
        start: 'top top',
        end: () => `+=${window.innerHeight * (isMobile ? 1.45 : 2)}`,
        pin: stage,
        scrub: isMobile ? 0.72 : 1.05,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => updateInteraction(self.progress >= 0.97),
      },
    });

    timeline
      .to(letters, { x: 0, y: 0, duration: 0.55, stagger: 0.004 }, 0)
      .to(modelFade, {
        value: 1,
        duration: 0.3,
        ease: 'none',
        onUpdate: () => setModelOpacity(modelFade.value),
      }, 0.15)
      .to(scrollCue, { autoAlpha: 0, y: 8, duration: 0.12 }, 0.08)
      .to(visualGroup.position, { x: poses.final.x, y: poses.final.y, duration: 0.6 }, 0.15)
      .to(visualGroup.rotation, { z: poses.final.zRotation, duration: 0.6 }, 0.15)
      .to(visualGroup.scale, {
        x: poses.final.scale,
        y: poses.final.scale,
        z: poses.final.scale,
        duration: 0.6,
      }, 0.15)
      .to(atmosphere, { opacity: 1, duration: 0.3 }, 0.45)
      .to(stage, { backgroundColor: '#080708', duration: 0.3 }, 0.45)
      .to(becomes, { color: '#ffffff', duration: 0.3 }, 0.45)
      .to(header, { color: '#292929', backgroundColor: '#e6d9d4', duration: 0.3 }, 0.45)
      .to(intro, { autoAlpha: 1, y: 0, duration: 0.22 }, 0.75)
      .to(interactionCue, { autoAlpha: 1, y: 0, duration: 0.18 }, 0.82);

    timeline.progress(progress);
    updateInteraction(progress >= 0.97);
    ScrollTrigger.refresh();
  }

  function handleResize() {
    const nextWidth = window.innerWidth;
    if (nextWidth <= 900 && Math.abs(nextWidth - viewportWidth) < 2) return;
    viewportWidth = nextWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const progress = timeline?.progress() ?? 0;
      buildTimeline(progress);
    }, 180);
  }

  function handleMotionPreference() {
    buildTimeline(reducedMotion.matches ? 1 : 0);
  }

  buildTimeline();
  window.addEventListener('resize', handleResize);
  reducedMotion.addEventListener('change', handleMotionPreference);

  return () => {
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    updateInteraction(false);
    setModelOpacity(1);
    timeline?.scrollTrigger?.kill();
    timeline?.kill();
  };
}
