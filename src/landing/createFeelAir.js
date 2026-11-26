import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getStylePose } from './createStyleExperience.js';

gsap.registerPlugin(ScrollTrigger);

const AIRFLOW_ENTRY = 0.4;
const COANDA_SOUND_ENTRY = AIRFLOW_ENTRY + 0.003;
const COANDA_SOUND_RESET = 0.1;

function getFeelPose(viewportWidth = window.innerWidth) {
  if (viewportWidth < 768 && window.matchMedia('(min-height: 620px) and (orientation: portrait)').matches) {
    return { x: 0, y: 0.1, zRotation: 0.27, scale: 1.85 };
  }
  if (viewportWidth <= 680) {
    return { x: 0.48, y: -0.35, zRotation: 1.18, scale: 0.68 };
  }
  if (viewportWidth <= 900) {
    return { x: 1.75, y: 0.35, zRotation: 1.28, scale: 0.75 };
  }
  if (viewportWidth <= 1280) {
    return { x: 3.7, y: 0.95, zRotation: 1.36, scale: 0.96 };
  }
  return { x: 4.1, y: 1.05, zRotation: 1.36, scale: 1.02 };
}

function createAirflow(model, addFrameCallback, reducedMotion) {
  const mobileProfile = window.matchMedia('(max-width: 900px)').matches;
  const streamCount = mobileProfile ? 6 : 9;
  const pointCount = mobileProfile ? 72 : 128;
  const group = new THREE.Group();
  group.name = 'coandaAirflowGroup';
  group.visible = false;
  group.renderOrder = 8;
  model.attachmentAnchor.add(group);

  const streams = [];
  const geometries = new Set();
  const materials = new Set();
  let reveal = 0;
  let active = false;
  let pointerTarget = 0;
  let pointerCurrent = 0;
  let reduced = reducedMotion.matches;

  for (let streamIndex = 0; streamIndex < streamCount; streamIndex += 1) {
    const startAngle = (streamIndex / streamCount) * Math.PI * 2 + 0.22;
    const points = [];
    const controlCount = 15;

    for (let pointIndex = 0; pointIndex < controlCount; pointIndex += 1) {
      const t = pointIndex / (controlCount - 1);
      const angle = startAngle + t * Math.PI * 2.65;
      const breathing = Math.sin(t * Math.PI) * 0.22;
      const radius = 1.05 + breathing + Math.sin(t * Math.PI * 3 + streamIndex) * 0.04;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.18 + t * 4.95,
        Math.sin(angle) * radius,
      ));
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
    const sampledPoints = curve.getPoints(pointCount - 1);
    const positions = sampledPoints.flatMap((point) => [point.x, point.y, point.z]);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);
    geometries.add(geometry);

    const baseMaterial = new LineMaterial({
      color: streamIndex % 2 ? 0xe6b3ac : 0xb47b76,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      linewidth: 3.1,
      worldUnits: false,
      toneMapped: false,
    });
    baseMaterial.userData.excludeFromModelOpacity = true;
    materials.add(baseMaterial);
    const baseLine = new Line2(geometry, baseMaterial);
    baseLine.frustumCulled = false;
    baseLine.userData.excludeFromModelOpacity = true;
    group.add(baseLine);

    const tracerMaterial = new LineMaterial({
      color: streamIndex % 3 === 0 ? 0xf0c2bb : 0xc98f89,
      transparent: true,
      opacity: 0,
      depthTest: true,
      depthWrite: false,
      linewidth: 5.2,
      worldUnits: false,
      dashed: true,
      dashSize: 0.32,
      gapSize: 0.68,
      toneMapped: false,
    });
    tracerMaterial.userData.excludeFromModelOpacity = true;
    materials.add(tracerMaterial);
    const tracer = new Line2(geometry, tracerMaterial);
    tracer.computeLineDistances();
    tracer.frustumCulled = false;
    tracer.userData.excludeFromModelOpacity = true;
    group.add(tracer);

    streams.push({
      baseMaterial,
      tracer,
      tracerMaterial,
      phase: streamIndex / streamCount,
      speed: 0.16 + streamIndex * 0.008,
    });
  }

  function updateResolution() {
    streams.forEach((stream) => {
      stream.baseMaterial.resolution.set(window.innerWidth, window.innerHeight);
      stream.tracerMaterial.resolution.set(window.innerWidth, window.innerHeight);
    });
  }
  updateResolution();
  window.addEventListener('resize', updateResolution);

  function updateStaticAppearance() {
    group.visible = reveal > 0.002;
    const visibility = Math.sqrt(reveal);
    streams.forEach((stream) => {
      stream.baseMaterial.opacity = visibility * 0.42;
      if (reduced) {
        stream.tracerMaterial.dashOffset = -stream.phase;
        stream.tracerMaterial.opacity = visibility * 0.58;
      }
    });
  }

  const removeFrameCallback = addFrameCallback(({ delta, elapsed }) => {
    if (!group.visible) return;
    pointerCurrent += (pointerTarget - pointerCurrent) * Math.min(1, delta * 3.6);
    const amplitude = 1 + pointerCurrent * 0.12;
    const pulse = active && !reduced ? 1 + Math.sin(elapsed * 2.1) * 0.075 : 1;
    const introExpansion = 1 + (1 - reveal) ** 2 * 1.3;
    group.scale.set(
      amplitude * pulse * introExpansion,
      1,
      (1 + pointerCurrent * 0.08) * pulse * introExpansion,
    );
    group.rotation.y = active && !reduced ? elapsed * 0.55 : 0;

    if (!active || reduced) return;
    streams.forEach((stream) => {
      const phase = (elapsed * stream.speed * (1 + pointerCurrent * 0.1) + stream.phase) % 1;
      stream.tracerMaterial.dashOffset = -phase * 2.4;
      stream.tracerMaterial.opacity = Math.sqrt(reveal) * 0.92 * Math.sin(Math.PI * phase) ** 2;
    });
  });

  return {
    group,
    setReveal(value) {
      reveal = THREE.MathUtils.clamp(value, 0, 1);
      updateStaticAppearance();
    },
    setActive(value) {
      active = value;
      if (!active && !reduced) {
        streams.forEach((stream) => { stream.tracerMaterial.opacity = 0; });
      }
    },
    setPointer(value) {
      pointerTarget = THREE.MathUtils.clamp(value, -1, 1);
    },
    setReducedMotion(value) {
      reduced = value;
      updateStaticAppearance();
    },
    destroy() {
      removeFrameCallback();
      window.removeEventListener('resize', updateResolution);
      model.attachmentAnchor.remove(group);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

export function createFeelAir({
  section,
  styleSection,
  sceneContainer,
  frameStyle,
  frameFeel,
  visualGroup,
  model,
  setModelOpacity,
  setInteractionEnabled,
  addFrameCallback,
  onAirflowSound,
  onAirflowSoundReset,
}) {
  if (!section) return () => {};

  const content = section.querySelector('.feel-air__content');
  const heading = section.querySelector('.feel-air__heading');
  const titleLines = [...section.querySelectorAll('.feel-air__title-line')];
  const copy = section.querySelector('.feel-air__copy');
  const styleContent = styleSection?.querySelector('.create-style-content');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const airflowState = {
    reveal: 0,
    active: false,
    pointer: 0,
    reduced: reducedMotion.matches,
  };
  let airflowInstance;
  let airflowIdleId;

  function ensureAirflow() {
    if (airflowInstance) return airflowInstance;
    airflowInstance = createAirflow(model, addFrameCallback, reducedMotion);
    airflowInstance.setReducedMotion(airflowState.reduced);
    airflowInstance.setPointer(airflowState.pointer);
    airflowInstance.setReveal(airflowState.reveal);
    airflowInstance.setActive(airflowState.active);
    return airflowInstance;
  }

  const airflow = {
    ensure: ensureAirflow,
    setReveal(value) {
      airflowState.reveal = value;
      airflowInstance?.setReveal(value);
    },
    setActive(value) {
      airflowState.active = value;
      airflowInstance?.setActive(value);
    },
    setPointer(value) {
      airflowState.pointer = value;
      airflowInstance?.setPointer(value);
    },
    setReducedMotion(value) {
      airflowState.reduced = value;
      airflowInstance?.setReducedMotion(value);
    },
    destroy() {
      airflowInstance?.destroy();
      airflowInstance = undefined;
    },
  };

  if ('requestIdleCallback' in window) {
    airflowIdleId = window.requestIdleCallback(ensureAirflow, { timeout: 1800 });
  } else {
    airflowIdleId = window.setTimeout(ensureAirflow, 900);
  }
  let transitionTimeline;
  let lifecycleTrigger;
  let airflowSoundPlayed = false;
  let previousAttachment = model.getActiveAttachment();
  let feelSessionStarted = false;
  let sectionVisible = false;
  let resizeTimer;
  let viewportWidth = window.innerWidth;

  function enterFeel({ rememberAttachment = true } = {}) {
    airflow.ensure();
    if (rememberAttachment && !feelSessionStarted) {
      previousAttachment = model.getActiveAttachment();
    }
    feelSessionStarted = true;
    setModelOpacity(1);
    setInteractionEnabled(false);
    model.setAttachment('curling');
    airflow.setActive(sectionVisible && !reducedMotion.matches);
  }

  function leaveFeelBack() {
    airflow.setActive(false);
    airflow.setReveal(0);
    if (previousAttachment) model.setAttachment(previousAttachment);
    feelSessionStarted = false;
    setModelOpacity(1);
    setInteractionEnabled(true);
  }

  function buildMotion() {
    transitionTimeline?.scrollTrigger?.kill();
    transitionTimeline?.kill();
    lifecycleTrigger?.kill();
    airflow.setReducedMotion(reducedMotion.matches);

    const stylePose = frameStyle(getStylePose());
    const feelPose = frameFeel(getFeelPose());
    gsap.set([heading, copy, ...titleLines], {
      clearProps: 'transform,opacity,visibility,letter-spacing',
    });

    if (reducedMotion.matches) {
      onAirflowSoundReset?.();
      lifecycleTrigger = ScrollTrigger.create({
        id: 'feel-air-reduced',
        trigger: section,
        start: 'top 70%',
        end: 'bottom 25%',
        onEnter: () => {
          sectionVisible = true;
          enterFeel();
          visualGroup.position.set(feelPose.x, feelPose.y, 0);
          visualGroup.rotation.z = feelPose.zRotation;
          visualGroup.scale.setScalar(feelPose.scale);
          airflow.setReveal(0.62);
          gsap.set([heading, copy], { autoAlpha: 1, y: 0 });
          gsap.set(titleLines, { x: 0, letterSpacing: '-0.035em' });
          if (styleContent) gsap.set(styleContent, { autoAlpha: 0 });
        },
        onEnterBack: () => {
          sectionVisible = true;
          enterFeel({ rememberAttachment: false });
          airflow.setReveal(0.62);
        },
        onLeave: () => {
          sectionVisible = false;
          airflow.setActive(false);
        },
        onLeaveBack: () => {
          sectionVisible = false;
          visualGroup.position.set(stylePose.x, stylePose.y, 0);
          visualGroup.rotation.z = stylePose.zRotation;
          visualGroup.scale.setScalar(stylePose.scale);
          if (styleContent) gsap.set(styleContent, { autoAlpha: 1 });
          leaveFeelBack();
        },
      });
      return;
    }

    const airflowReveal = { value: 0 };
    const titleSpread = window.innerWidth < 768 ? 12 : window.innerWidth < 1024 ? 42 : 86;
    const initialTracking = window.innerWidth < 768 ? '0.04em' : '0.24em';
    let previousProgress;
    transitionTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'feel-air-transition',
        trigger: section,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true,
        onRefresh: ({ progress }) => { previousProgress = progress; },
        onUpdate: (trigger) => {
          airflow.setReveal(airflowReveal.value);
          const previous = previousProgress;
          const { progress, direction } = trigger;
          previousProgress = progress;
          if (previous === undefined || ScrollTrigger.isRefreshing) return;

          if (progress <= COANDA_SOUND_RESET && airflowSoundPlayed) {
            airflowSoundPlayed = false;
            onAirflowSoundReset?.();
          } else if (direction > 0 && previous < COANDA_SOUND_ENTRY && progress >= COANDA_SOUND_ENTRY
            && !airflowSoundPlayed) {
            airflowSoundPlayed = true;
            const inSoundWindow = () => trigger === transitionTimeline?.scrollTrigger
              && trigger.isActive && trigger.progress >= COANDA_SOUND_ENTRY && trigger.progress < 0.72;
            if (inSoundWindow()) onAirflowSound?.(inSoundWindow);
          }
        },
      },
    });

    transitionTimeline
      .fromTo(
        visualGroup.position,
        { x: stylePose.x, y: stylePose.y },
        { x: feelPose.x, y: feelPose.y, duration: 1 },
        0,
      )
      .fromTo(
        visualGroup.rotation,
        { z: stylePose.zRotation },
        { z: feelPose.zRotation, duration: 1 },
        0,
      )
      .fromTo(
        visualGroup.scale,
        { x: stylePose.scale, y: stylePose.scale, z: stylePose.scale },
        { x: feelPose.scale, y: feelPose.scale, z: feelPose.scale, duration: 1 },
        0,
      )
      .fromTo(heading, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.42 }, 0.34)
      .fromTo(
        titleLines,
        {
          x: (index) => (index === 0 ? -titleSpread : titleSpread),
          letterSpacing: initialTracking,
        },
        { x: 0, letterSpacing: '-0.035em', duration: 0.56 },
        0.28,
      )
      .fromTo(copy, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.38 }, 0.5)
      .fromTo(airflowReveal, { value: 0 }, { value: 1, duration: 0.58 }, AIRFLOW_ENTRY);

    if (styleContent) transitionTimeline.to(styleContent, { autoAlpha: 0, y: -20, duration: 0.44 }, 0);

    lifecycleTrigger = ScrollTrigger.create({
      id: 'feel-air-lifecycle',
      trigger: section,
      start: 'top 72%',
      end: 'bottom 20%',
      onEnter: () => {
        sectionVisible = true;
        enterFeel();
      },
      onEnterBack: () => {
        sectionVisible = true;
        enterFeel({ rememberAttachment: false });
      },
      onLeave: () => {
        sectionVisible = false;
        airflow.setActive(false);
      },
      onLeaveBack: () => {
        sectionVisible = false;
        leaveFeelBack();
      },
    });

  }

  function handlePointerMove(event) {
    const rect = section.getBoundingClientRect();
    const normalized = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    airflow.setPointer(normalized);
  }

  function handlePointerLeave() {
    airflow.setPointer(0);
  }

  function handleResize() {
    const nextWidth = window.innerWidth;
    if (nextWidth <= 900 && Math.abs(nextWidth - viewportWidth) < 2) return;
    viewportWidth = nextWidth;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      buildMotion();
      ScrollTrigger.refresh();
    }, 180);
  }

  function handleMotionPreference() {
    buildMotion();
    ScrollTrigger.refresh();
  }

  section.addEventListener('pointermove', handlePointerMove, { passive: true });
  section.addEventListener('pointerleave', handlePointerLeave);
  window.addEventListener('resize', handleResize);
  reducedMotion.addEventListener('change', handleMotionPreference);
  buildMotion();

  // Fade the shared canvas as a layer so the Airwrap and airflow leave together.
  // This does not compete with entrance opacity or change the product's pose.
  const syncExitOpacity = ({ progress }) => {
    const opacity = reducedMotion.matches ? Number(progress < 1) : 1 - progress;
    sceneContainer.style.setProperty('--feel-air-exit-opacity', opacity);
    sceneContainer.classList.toggle('is-past-feel', opacity <= 0.002);
  };
  const exitTrigger = ScrollTrigger.create({
    id: 'feel-air-exit',
    trigger: section,
    start: 'bottom 90%',
    end: 'bottom 30%',
    onUpdate: syncExitOpacity,
    onRefresh: syncExitOpacity,
  });

  return () => {
    window.clearTimeout(resizeTimer);
    section.removeEventListener('pointermove', handlePointerMove);
    section.removeEventListener('pointerleave', handlePointerLeave);
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    if ('cancelIdleCallback' in window) window.cancelIdleCallback(airflowIdleId);
    else window.clearTimeout(airflowIdleId);
    transitionTimeline?.scrollTrigger?.kill();
    transitionTimeline?.kill();
    lifecycleTrigger?.kill();
    exitTrigger.kill();
    sceneContainer.style.removeProperty('--feel-air-exit-opacity');
    sceneContainer.classList.remove('is-past-feel');
    airflow.destroy();
  };
}
