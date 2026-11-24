import './styles.css';
import './landing/colorTheme.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createFallbackScene, createScene } from './scene/createScene.js';
import { createHeroMotion, HERO_FRAMING_BREAKPOINT } from './landing/createHeroMotion.js';
import { createReactiveHeroBackground } from './landing/createReactiveHeroBackground.js';
import { createStyleExperience } from './landing/createStyleExperience.js';
import { createCustomCursor } from './landing/createCustomCursor.js';
import { createPossibilitiesMotion } from './landing/createPossibilitiesMotion.js';
import { createTrailerExperience } from './landing/createTrailerExperience.js';
import { createEditorialCarousel } from './landing/createEditorialCarousel.js';
import { createMeetProduct } from './landing/createMeetProduct.js';
import { createFeelAir } from './landing/createFeelAir.js';
import { createTechnologyVideo } from './landing/createTechnologyVideo.js';
import { createFooterMotion } from './landing/createFooterMotion.js';
import { createNavigationMenu } from './landing/createNavigationMenu.js';
import { fitProductPose } from './landing/fitProductPose.js';

ScrollTrigger.config({ ignoreMobileResize: true });

const stage = document.querySelector('.hero-stage');
const styleSection = document.querySelector('.create-style-scroll');
const feelAirSection = document.querySelector('.feel-air');
const possibilitiesSection = document.querySelector('.possibilities-scroll');
const carouselSection = document.querySelector('.editorial-carousel');
const meetProductSection = document.querySelector('.meet-product');
const footer = document.querySelector('.site-footer');
const sceneContainer = document.querySelector('#hero-scene');
const menuToggle = document.querySelector('.menu-toggle');
const heroGlow = stage.querySelector('.hero-cursor-glow');

const destroyReactiveBackground = createReactiveHeroBackground({
  stage,
  glow: heroGlow,
});

const sceneLoading = sceneContainer.querySelector('.scene-loading');
sceneContainer.addEventListener('dysonscenecontextlost', () => {
  if (sceneLoading) sceneLoading.textContent = 'Restaurando experiencia 3D…';
});
sceneContainer.addEventListener('dysonscenecontextrestored', () => {
  if (sceneLoading) sceneLoading.textContent = 'Preparando experiencia 3D…';
});

let studio;
try {
  studio = createScene(sceneContainer, {
    transparent: true,
    controlsEnabled: false,
  });
} catch (error) {
  console.error('No fue posible iniciar WebGL; se utilizará la vista estática.', error);
  sceneContainer.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
  studio = createFallbackScene(sceneContainer);
}
studio.setModelOpacity(0);
window.__dyson3dDiagnostics = () => studio.getPerformanceSnapshot();

const destroyCustomCursor = createCustomCursor({
  cursor: document.querySelector('.custom-cursor'),
  heroStage: stage,
  sceneContainer,
  hitTestProduct: studio.hitTestProduct,
  isInteractionEnabled: studio.isInteractionEnabled,
});
const destroyNavigationMenu = createNavigationMenu({
  toggle: menuToggle,
  menu: document.querySelector('.navigation-menu'),
  page: document.querySelector('.air-studio-experience'),
});

let destroyMotion = () => {};
let destroyStyleExperience = () => {};
let destroyPossibilitiesMotion = () => {};
let trailerExperience = { setRevealActive: () => {}, destroy: () => {} };
let destroyEditorialCarousel = () => {};
let destroyMeetProduct = () => {};
let destroyFeelAir = () => {};
let destroyTechnologyVideo = () => {};
let destroyFooterMotion = () => {};

document.fonts.ready.then(() => {
  const frameProduct = (frame, selector, options) => {
    const slot = frame.querySelector(selector);
    return (pose) => fitProductPose(studio, frame, slot, pose, options);
  };
  const frameHero = frameProduct(stage, '.hero-visual-space', { breakpoint: HERO_FRAMING_BREAKPOINT });
  const frameStyle = frameProduct(styleSection.querySelector('.create-style-content'), '.create-style-visual-space');
  const frameFeel = frameProduct(feelAirSection.querySelector('.feel-air__content'), '.feel-air__visual-space', { airflow: true });

  destroyMotion = createHeroMotion({
    stage,
    sceneContainer,
    frameHero,
    visualGroup: studio.visualGroup,
    setModelOpacity: studio.setModelOpacity,
    setInteractionEnabled: studio.setInteractionEnabled,
  });
  destroyStyleExperience = createStyleExperience({
    section: styleSection,
    heroStage: stage,
    frameHero,
    frameStyle,
    visualGroup: studio.visualGroup,
    model: studio.model,
    setModelOpacity: studio.setModelOpacity,
    setInteractionEnabled: studio.setInteractionEnabled,
  });
  destroyFeelAir = createFeelAir({
    section: feelAirSection,
    styleSection,
    sceneContainer,
    frameStyle,
    frameFeel,
    visualGroup: studio.visualGroup,
    model: studio.model,
    setModelOpacity: studio.setModelOpacity,
    setInteractionEnabled: studio.setInteractionEnabled,
    addFrameCallback: studio.addFrameCallback,
  });
  destroyTechnologyVideo = createTechnologyVideo({
    section: feelAirSection,
    modal: document.querySelector('.technology-modal'),
    page: document.querySelector('.air-studio-experience'),
    setInteractionEnabled: studio.setInteractionEnabled,
    isInteractionEnabled: studio.isInteractionEnabled,
  });
  trailerExperience = createTrailerExperience({
    section: possibilitiesSection,
    modal: document.querySelector('.trailer-modal'),
    page: document.querySelector('.air-studio-experience'),
  });
  destroyEditorialCarousel = createEditorialCarousel({ section: carouselSection });
  destroyPossibilitiesMotion = createPossibilitiesMotion({
    section: possibilitiesSection,
    nextSection: meetProductSection,
    modelBoundarySection: carouselSection,
    setModelOpacity: studio.setModelOpacity,
    setInteractionEnabled: studio.setInteractionEnabled,
    onVideoRevealChange: trailerExperience.setRevealActive,
  });
  destroyMeetProduct = createMeetProduct({
    section: meetProductSection,
  });
  destroyFooterMotion = createFooterMotion({ footer });
});

window.addEventListener(
  'pagehide',
  () => {
    destroyMotion();
    destroyStyleExperience();
    destroyFeelAir();
    destroyTechnologyVideo();
    destroyFooterMotion();
    destroyReactiveBackground();
    destroyCustomCursor();
    destroyNavigationMenu();
    destroyPossibilitiesMotion();
    trailerExperience.destroy();
    destroyEditorialCarousel();
    destroyMeetProduct();
    studio.destroy();
    delete window.__dyson3dDiagnostics;
  },
  { once: true },
);
