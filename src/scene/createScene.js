import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from '../config/productConfig.js';
import { createCamera, resetCamera } from './camera.js';
import { addStudioLighting, createStudioEnvironment } from './lighting.js';
import { createAirwrap } from '../models/Airwrap.js';

export function createScene(
  container,
  { transparent = false, controlsEnabled = true, background = 0xffffff } = {},
) {
  const scene = new THREE.Scene();
  scene.background = transparent ? null : new THREE.Color(background);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: transparent,
    powerPreference: 'high-performance',
  });
  if (transparent) renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const environmentTarget = createStudioEnvironment(renderer);
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
      });
    });
  }
  collectMaterialStates();

  function setModelOpacity(value) {
    collectMaterialStates();
    const opacity = THREE.MathUtils.clamp(value, 0, 1);
    materialStates.forEach((state) => {
      const fading = opacity < 0.999;
      const transparencyChanged = state.material.transparent !== (fading || state.transparent);
      state.material.opacity = state.opacity * opacity;
      state.material.transparent = fading || state.transparent;
      state.material.depthWrite = fading ? false : state.depthWrite;
      if (transparencyChanged) state.material.needsUpdate = true;
    });
  }

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
  function render() {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    frameCallbacks.forEach((callback) => callback({ delta, elapsed }));
    interactionGroup.rotation.x += (rotationTarget.x - interactionGroup.rotation.x) * 0.11;
    interactionGroup.rotation.y += (rotationTarget.y - interactionGroup.rotation.y) * 0.11;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }
  render();

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
    setModelOpacity,
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
      cancelAnimationFrame(frameId);
      releaseActivePointer();
      frameCallbacks.clear();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', finishPointer);
      renderer.domElement.removeEventListener('pointercancel', finishPointer);
      setModelOpacity(1);
      controls.dispose();
      model.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
