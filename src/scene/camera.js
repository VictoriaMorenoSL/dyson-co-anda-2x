import * as THREE from 'three';
import { CAMERA } from '../config/productConfig.js';

export function getCameraPreset() {
  return window.matchMedia('(max-width: 680px)').matches ? CAMERA.mobile : CAMERA.desktop;
}

export function createCamera(aspect) {
  const preset = getCameraPreset();
  const camera = new THREE.PerspectiveCamera(preset.fov, aspect, 0.1, 100);
  camera.position.fromArray(preset.position);
  camera.lookAt(...CAMERA.target);
  return camera;
}

export function resetCamera(camera, controls, animate = true) {
  const preset = getCameraPreset();
  const startPosition = camera.position.clone();
  const endPosition = new THREE.Vector3(...preset.position);
  const startTarget = controls.target.clone();
  const endTarget = new THREE.Vector3(...CAMERA.target);
  const startTime = performance.now();
  const duration = animate ? 520 : 0;

  camera.fov = preset.fov;
  camera.updateProjectionMatrix();

  function update(time) {
    const progress = duration === 0 ? 1 : Math.min((time - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    camera.position.lerpVectors(startPosition, endPosition, eased);
    controls.target.lerpVectors(startTarget, endTarget, eased);
    controls.update();
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}
