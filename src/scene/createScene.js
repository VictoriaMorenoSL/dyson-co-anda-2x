import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CAMERA } from '../config/productConfig.js';
import { createCamera, resetCamera } from './camera.js';
import { addStudioLighting, createStudioEnvironment } from './lighting.js';
import { createAirwrap } from '../models/Airwrap.js';

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = CAMERA.minDistance;
  controls.maxDistance = CAMERA.maxDistance;
  controls.minPolarAngle = Math.PI * 0.24;
  controls.maxPolarAngle = Math.PI * 0.76;
  controls.target.fromArray(CAMERA.target);
  controls.update();

  addStudioLighting(scene);
  const productGroup = createAirwrap();
  const model = productGroup.userData.model;
  scene.add(productGroup);

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

  let frameId;
  function render() {
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
    model,
    reset: () => resetCamera(camera, controls),
    destroy() {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      model.dispose();
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
