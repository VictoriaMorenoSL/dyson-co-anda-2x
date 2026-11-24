import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getHeroProductPose } from './createHeroMotion.js';

gsap.registerPlugin(ScrollTrigger);

const STYLE_STATES = Object.freeze({
  curls: {
    title: ['RIZOS', 'DEFINIDOS'],
    accessory: 'Rizador Co-anda2x™',
    technology: 'Efecto Coanda',
    result: 'Rizos definidos',
    attachment: 'curling',
  },
  waves: {
    title: ['ONDAS', 'SUAVES'],
    accessory: 'Rizador Co-anda2x™',
    technology: 'Efecto Coanda',
    result: 'Ondas con movimiento',
    attachment: 'curling',
  },
  smooth: {
    title: ['LISO Y', 'SUAVE'],
    accessory: 'AirSmooth2x™',
    technology: 'Aire a presión',
    result: 'Acabado más liso',
    attachment: 'airSmooth',
  },
  volume: {
    title: ['VOLUMEN', 'Y FORMA'],
    accessory: 'Cepillo voluminizador 2x',
    technology: 'Aire y cepillado',
    result: 'Cuerpo y movimiento',
    attachment: 'roundBrush',
  },
});

export function getStylePose(viewportWidth = window.innerWidth) {
  if (viewportWidth <= 680) {
    return { x: 0.95, y: 0.82, zRotation: 0, scale: 0.76 };
  }
  if (viewportWidth <= 900) {
    return { x: 2.45, y: -0.5, zRotation: 0, scale: 0.78 };
  }
  if (viewportWidth <= 1280) {
    return { x: 4.2, y: -3.25, zRotation: 0, scale: 1.12 };
  }
  return { x: 4.7, y: -2.8, zRotation: 0, scale: 1.16 };
}

function setPose(group, pose) {
  group.position.set(pose.x, pose.y, 0);
  group.rotation.set(0, 0, pose.zRotation);
  group.scale.setScalar(pose.scale);
}

export function createStyleExperience({
  section,
  heroStage,
  visualGroup,
  model,
  setModelOpacity,
  setInteractionEnabled,
}) {
  const content = section.querySelector('.create-style-content');
  const atmosphere = section.querySelector('.create-style-atmosphere');
  const title = section.querySelector('.create-style-title');
  const titleLines = [...title.querySelectorAll('span')];
  const accessory = section.querySelector('[data-style-accessory]');
  const technology = section.querySelector('[data-style-technology]');
  const result = section.querySelector('[data-style-result]');
  const features = section.querySelector('.style-features');
  const cards = [...section.querySelectorAll('.style-card')];
  const heroContent = [
    heroStage.querySelector('.hero-typography'),
    heroStage.querySelector('.hero-intro'),
    heroStage.querySelector('.interaction-cue'),
    heroStage.querySelector('.site-header'),
  ];
  const animatedCopy = [title, features];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let scrollTimeline;
  let copyTimeline;
  let currentStyle = 'curls';
  const cardHandlers = new Map();

  function updateCopy(key) {
    const state = STYLE_STATES[key];
    titleLines[0].textContent = state.title[0];
    titleLines[1].textContent = state.title[1];
    accessory.textContent = state.accessory;
    technology.textContent = state.technology;
    result.textContent = state.result;
  }

  function updateCards(key) {
    cards.forEach((card) => {
      const active = card.dataset.style === key;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-pressed', String(active));
    });
  }

  function selectStyle(key) {
    if (!STYLE_STATES[key] || key === currentStyle) return;
    const nextState = STYLE_STATES[key];
    const attachmentChanged = model.getActiveAttachment() !== nextState.attachment;
    currentStyle = key;
    updateCards(key);

    copyTimeline?.kill();
    copyTimeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
    copyTimeline
      .to(animatedCopy, { autoAlpha: 0, y: -12, duration: 0.18, ease: 'power2.in' })
      .call(() => updateCopy(key))
      .fromTo(
        animatedCopy,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.05, ease: 'power2.out' },
      );

    if (attachmentChanged) model.setAttachment(nextState.attachment);
    setModelOpacity(1);
  }

  function buildScrollMotion() {
    scrollTimeline?.scrollTrigger?.kill();
    scrollTimeline?.kill();

    const heroPose = getHeroProductPose().final;
    const stylePose = getStylePose();
    gsap.set(content, { autoAlpha: 0 });
    gsap.set(atmosphere, { opacity: 1 });
    gsap.set([title, features], { y: 26 });
    gsap.set(cards, { autoAlpha: 0, y: 24, scale: 0.96 });

    if (reducedMotion.matches) {
      const trigger = ScrollTrigger.create({
        id: 'create-style-reduced',
        trigger: section,
        start: 'top 55%',
        onEnter: () => {
          setModelOpacity(1);
          setPose(visualGroup, stylePose);
          gsap.set(atmosphere, { opacity: 1 });
          gsap.set(content, { autoAlpha: 1 });
          gsap.set([title, features, cards], { autoAlpha: 1, y: 0, scale: 1 });
          setInteractionEnabled(true);
        },
        onLeaveBack: () => {
          setPose(visualGroup, heroPose);
          gsap.set(content, { autoAlpha: 0 });
          setInteractionEnabled(true);
        },
      });
      scrollTimeline = { scrollTrigger: trigger, kill: () => trigger.kill() };
      return;
    }

    scrollTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'create-style-transition',
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: 0.9,
        invalidateOnRefresh: true,
        onEnter: () => {
          setModelOpacity(1);
          setInteractionEnabled(true);
        },
        onEnterBack: () => {
          setModelOpacity(1);
          setInteractionEnabled(true);
        },
        onLeave: () => {
          setModelOpacity(1);
          setInteractionEnabled(true);
        },
        onLeaveBack: () => setInteractionEnabled(true),
        onUpdate: (self) => {
          if (self.progress > 0) setModelOpacity(1);
          if (self.isActive) {
            const isTransitioning = self.progress > 0.04 && self.progress < 0.96;
            setInteractionEnabled(!isTransitioning);
          }
        },
      },
    });

    scrollTimeline
      .fromTo(
        visualGroup.position,
        { x: heroPose.x, y: heroPose.y },
        { x: stylePose.x, y: stylePose.y, duration: 1 },
        0,
      )
      .fromTo(
        visualGroup.rotation,
        { z: heroPose.zRotation },
        { z: stylePose.zRotation, duration: 1 },
        0,
      )
      .fromTo(
        visualGroup.scale,
        { x: heroPose.scale, y: heroPose.scale, z: heroPose.scale },
        { x: stylePose.scale, y: stylePose.scale, z: stylePose.scale, duration: 1 },
        0,
      )
      .to(heroContent, { autoAlpha: 0, y: -18, duration: 0.42 }, 0)
      .to(content, { autoAlpha: 1, duration: 0.38 }, 0.34)
      .to([title, features], { y: 0, duration: 0.42, ease: 'power2.out' }, 0.38)
      .to(cards, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.36,
        stagger: 0.055,
        ease: 'power2.out',
      }, 0.53);
  }

  cards.forEach((card) => {
    const handler = () => selectStyle(card.dataset.style);
    cardHandlers.set(card, handler);
    card.addEventListener('click', handler);
  });

  const handleResize = () => {
    window.clearTimeout(handleResize.timer);
    handleResize.timer = window.setTimeout(() => {
      buildScrollMotion();
      ScrollTrigger.refresh();
    }, 220);
  };

  const handleMotionPreference = () => {
    buildScrollMotion();
    ScrollTrigger.refresh();
  };

  buildScrollMotion();
  window.addEventListener('resize', handleResize);
  reducedMotion.addEventListener('change', handleMotionPreference);

  return () => {
    window.clearTimeout(handleResize.timer);
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    cardHandlers.forEach((handler, card) => card.removeEventListener('click', handler));
    copyTimeline?.kill();
    scrollTimeline?.scrollTrigger?.kill();
    scrollTimeline?.kill();
  };
}
