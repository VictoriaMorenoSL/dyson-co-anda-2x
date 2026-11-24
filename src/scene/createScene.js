import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from '../config/productConfig.js';
import { createCamera, resetCamera } from './camera.js';
import { addStudioLighting, createStudioEnvironment } from './lighting.js';
import { createAirwrap } from '../models/Airwrap.js';

function getRendererProfile() {
  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const constrained = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  return {
    mobile,
    maxPixelRatio: mobile ? (constrained ? 1.25 : 1.5) : 2,
    environmentSize: mobile ? 128 : 256,
  };
}

export function createScene(
  container,
  { transparent = false, controlsEnabled = true, background = 0xffffff } = {},
) {
  performance.mark('dyson:scene-start');
  const scene = new THREE.Scene();
  scene.background = transparent ? null : new THREE.Color(background);
  let rendererProfile = getRendererProfile();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: transparent,
    powerPreference: 'high-performance',
  });
  performance.mark('dyson:renderer-ready');
  performance.measure('dyson:renderer-init', 'dyson:scene-start', 'dyson:renderer-ready');
  if (transparent) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererProfile.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const environmentTarget = createStudioEnvironment(renderer, {
    size: rendererProfile.environmentSize,
  });
  performance.mark('dyson:environment-ready');
  performance.measure('dyson:environment-init', 'dyson:renderer-ready', 'dyson:environment-ready');
  scene.environment = environmentTarget.texture;

  const camera = createCamera(1);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = controlsEnabled;
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.76;
  controls.target.fromArray(CAMERA.target);
  controls.update();
  // OrbitControls applies `touch-action: none` inline when it connects, even
  // while disabled. Restore native vertical panning for the shared mobile
  // canvas; the custom interaction below only captures horizontal drags.
  renderer.domElement.style.touchAction = 'pan-y';

  addStudioLighting(scene);
  const productGroup = createAirwrap();
  performance.mark('dyson:model-ready');
  performance.measure('dyson:model-build', 'dyson:environment-ready', 'dyson:model-ready');
  const model = productGroup.userData.model;
  const visualGroup = new THREE.Group();
  visualGroup.name = 'visualPresentationGroup';
  const interactionGroup = new THREE.Group();
  interactionGroup.name = 'userInteractionGroup';
  const modelOffsetGroup = new THREE.Group();
  modelOffsetGroup.name = 'interactionPivotOffset';
  interactionGroup.position.y = CAMERA.target[1];
  modelOffsetGroup.position.y = -CAMERA.target[1];
  modelOffsetGroup.add(productGroup);
  interactionGroup.add(modelOffsetGroup);
  visualGroup.add(interactionGroup);
  scene.add(visualGroup);

  const materialStates = [];
  const seenMaterials = new Set();
  function collectMaterialStates() {
    productGroup.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!material || material.userData.excludeFromModelOpacity || seenMaterials.has(material)) return;
        seenMaterials.add(material);
        materialStates.push({
          material,
          opacity: material.userData.modelBaseOpacity ?? material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
        if (rendererProfile.mobile && !material.transparent) {
          material.transparent = true;
          material.needsUpdate = true;
        }
      });
    });
  }
  collectMaterialStates();

  function setModelOpacity(value) {
    const opacity = THREE.MathUtils.clamp(value, 0, 1);
    materialStates.forEach((state) => {
      const fading = opacity < 0.999;
      const nextTransparent = rendererProfile.mobile || fading || state.transparent;
      const transparencyChanged = state.material.transparent !== nextTransparent;
      state.material.opacity = state.opacity * opacity;
      state.material.transparent = nextTransparent;
      state.material.depthWrite = fading ? false : state.depthWrite;
      if (transparencyChanged) state.material.needsUpdate = true;
    });
  }
  const removeAttachmentMaterialListener = model.onAttachmentChange(collectMaterialStates);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const rotationTarget = new THREE.Vector2();
  let interactionEnabled = false;
  let activePointer = null;
  let dragStarted = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let rotationStartY = 0;

  function releaseActivePointer(pointerId = activePointer) {
    if (pointerId !== null && renderer.domElement.hasPointerCapture(pointerId)) {
      renderer.domElement.releasePointerCapture(pointerId);
    }
    activePointer = null;
    dragStarted = false;
    container.classList.remove('is-grabbing');
  }

  function pointerHitsProductAt(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (
      clientX < rect.left
      || clientX > rect.right
      || clientY < rect.top
      || clientY > rect.bottom
    ) return false;

    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(productGroup, true).length > 0;
  }

  function pointerHitsProduct(event) {
    return pointerHitsProductAt(event.clientX, event.clientY);
  }

  function handlePointerDown(event) {
    if (!interactionEnabled || !pointerHitsProduct(event)) return;
    activePointer = event.pointerId;
    dragStarted = event.pointerType !== 'touch';
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    rotationStartY = rotationTarget.y;
    if (dragStarted) {
      renderer.domElement.setPointerCapture(event.pointerId);
      container.classList.add('is-grabbing');
    }
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointer) return;
    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    if (!dragStarted && Math.hypot(deltaX, deltaY) > 10) {
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        releaseActivePointer(event.pointerId);
        return;
      }
      dragStarted = true;
      renderer.domElement.setPointerCapture(event.pointerId);
      container.classList.add('is-grabbing');
    }

    if (!dragStarted) return;
    if (event.cancelable) event.preventDefault();
    rotationTarget.y = rotationStartY + deltaX * 0.008;
  }

  function finishPointer(event) {
    if (event.pointerId !== activePointer) return;
    releaseActivePointer(event.pointerId);
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);
  renderer.domElement.addEventListener('pointermove', handlePointerMove);
  renderer.domElement.addEventListener('pointerup', finishPointer);
  renderer.domElement.addEventListener('pointercancel', finishPointer);

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const nextProfile = getRendererProfile();
    if (nextProfile.maxPixelRatio !== rendererProfile.maxPixelRatio) {
      rendererProfile = nextProfile;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, rendererProfile.maxPixelRatio));
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const frameCallbacks = new Set();
  const clock = new THREE.Clock();
  let frameId;
  let firstFrameRendered = false;
  let contextLost = false;
  let destroyed = false;
  let modelOpacity = 1;

  function stopRendering() {
    if (frameId !== undefined) cancelAnimationFrame(frameId);
    frameId = undefined;
    clock.stop();
  }

  function startRendering() {
    if (destroyed || contextLost || document.hidden || frameId !== undefined) return;
    clock.start();
    frameId = requestAnimationFrame(render);
  }

  function render() {
    frameId = undefined;
    if (destroyed || contextLost || document.hidden) return;
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    frameCallbacks.forEach((callback) => callback({ delta, elapsed }));
    interactionGroup.rotation.x += (rotationTarget.x - interactionGroup.rotation.x) * 0.11;
    interactionGroup.rotation.y += (rotationTarget.y - interactionGroup.rotation.y) * 0.11;
    if (controls.enabled) controls.update();
    if (!firstFrameRendered || modelOpacity > 0.002) renderer.render(scene, camera);
    if (!firstFrameRendered) {
      firstFrameRendered = true;
      performance.mark('dyson:first-frame');
      performance.measure('dyson:scene-to-first-frame', 'dyson:scene-start', 'dyson:first-frame');
      container.dataset.sceneState = 'ready';
      container.dispatchEvent(new CustomEvent('dysonsceneready'));
    }
    frameId = requestAnimationFrame(render);
  }

  function handleVisibilityChange() {
    if (document.hidden) stopRendering();
    else startRendering();
  }

  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    stopRendering();
    container.dataset.sceneState = 'restoring';
    container.dispatchEvent(new CustomEvent('dysonscenecontextlost'));
  }

  function handleContextRestored() {
    contextLost = false;
    firstFrameRendered = false;
    container.dataset.sceneState = 'loading';
    container.dispatchEvent(new CustomEvent('dysonscenecontextrestored'));
    startRendering();
  }

  container.dataset.sceneState = 'loading';
  document.addEventListener('visibilitychange', handleVisibilityChange);
  renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
  renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored, false);
  if (rendererProfile.mobile && typeof renderer.compileAsync === 'function') {
    queueMicrotask(() => {
      performance.mark('dyson:shader-prepare-start');
      renderer.compileAsync(scene, camera)
        .catch(() => {})
        .finally(() => {
          performance.mark('dyson:shader-prepare-end');
          performance.measure(
            'dyson:shader-prepare',
            'dyson:shader-prepare-start',
            'dyson:shader-prepare-end',
          );
          startRendering();
        });
    });
  } else {
    startRendering();
  }

  return {
    scene,
    camera,
    controls,
    renderer,
    productGroup,
    visualGroup,
    interactionGroup,
    model,
    hitTestProduct: pointerHitsProductAt,
    isInteractionEnabled: () => interactionEnabled,
    isDragging: () => activePointer !== null && dragStarted,
    addFrameCallback(callback) {
      frameCallbacks.add(callback);
      return () => frameCallbacks.delete(callback);
    },
    setModelOpacity(value) {
      modelOpacity = THREE.MathUtils.clamp(value, 0, 1);
      setModelOpacity(modelOpacity);
      startRendering();
    },
    getPerformanceSnapshot() {
      return {
        pixelRatio: renderer.getPixelRatio(),
        render: { ...renderer.info.render },
        memory: { ...renderer.info.memory },
        programs: renderer.info.programs?.length ?? 0,
        profile: { ...rendererProfile },
      };
    },
    setInteractionEnabled(enabled) {
      interactionEnabled = enabled;
      container.classList.toggle('is-interactive', enabled);
      if (!enabled) {
        releaseActivePointer();
        rotationTarget.set(0, 0);
      }
    },
    reset: () => resetCamera(camera, controls),
    destroy() {
      destroyed = true;
      stopRendering();
      releaseActivePointer();
      frameCallbacks.clear();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', finishPointer);
      renderer.domElement.removeEventListener('pointercancel', finishPointer);
      removeAttachmentMaterialListener();
      setModelOpacity(1);
      controls.dispose();
      model.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function createFallbackScene(container) {
  const visualGroup = new THREE.Group();
  const interactionGroup = new THREE.Group();
  const attachmentAnchor = new THREE.Group();
  const fallbackImage = container.querySelector('.scene-fallback');
  let activeAttachment = 'curling';
  let interactionEnabled = false;
  const listeners = new Set();

  visualGroup.add(interactionGroup);
  interactionGroup.add(attachmentAnchor);
  container.classList.add('is-fallback');
  container.dataset.sceneState = 'fallback';

  const model = {
    attachmentAnchor,
    attachmentKeys: ['curling', 'fastDryer', 'roundBrush', 'airSmooth'],
    setAttachment(key) {
      activeAttachment = key;
      listeners.forEach((listener) => listener(key, null));
      return Promise.resolve(null);
    },
    getActiveAttachment: () => activeAttachment,
    onAttachmentChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() { listeners.clear(); },
  };

  return {
    scene: null,
    camera: null,
    controls: null,
    renderer: null,
    productGroup: attachmentAnchor,
    visualGroup,
    interactionGroup,
    model,
    hitTestProduct: () => false,
    isInteractionEnabled: () => interactionEnabled,
    isDragging: () => false,
    addFrameCallback: () => () => {},
    setModelOpacity(value) {
      if (fallbackImage) fallbackImage.style.opacity = String(THREE.MathUtils.clamp(value, 0, 1));
    },
    setInteractionEnabled(value) { interactionEnabled = value; },
    getPerformanceSnapshot: () => ({ fallback: true }),
    reset: () => {},
    destroy() {
      model.dispose();
      container.classList.remove('is-fallback');
    },
  };
}
