import * as THREE from 'three';

function createLightPanel(width, height, color, intensity = 1) {
  const radiance = new THREE.Color(color).multiplyScalar(intensity);
  const material = new THREE.MeshBasicMaterial({
    color: radiance,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
}

export function createStudioEnvironment(renderer) {
  const environmentScene = new THREE.Scene();
  environmentScene.background = new THREE.Color(0x171a1a);

  const leftSoftbox = createLightPanel(1.35, 8.5, 0xffffff, 4.8);
  leftSoftbox.position.set(-3.8, 0.4, 4.2);
  leftSoftbox.lookAt(0, 0.25, 0);
  environmentScene.add(leftSoftbox);

  const rightSoftbox = createLightPanel(0.85, 6.4, 0xeaf4f3, 3.1);
  rightSoftbox.position.set(4.4, 0.7, 2.4);
  rightSoftbox.lookAt(0, 0.2, 0);
  environmentScene.add(rightSoftbox);

  const warmFill = createLightPanel(2.3, 4.8, 0xffe2dc, 2.15);
  warmFill.position.set(-2.7, -0.3, -4.3);
  warmFill.lookAt(0, 0, 0);
  environmentScene.add(warmFill);

  const overhead = createLightPanel(5.5, 3.2, 0xffffff, 3.4);
  overhead.position.set(0, 4.8, 0.5);
  overhead.rotation.x = Math.PI / 2;
  environmentScene.add(overhead);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmremGenerator.fromScene(environmentScene, 0.055, 0.1, 100);
  pmremGenerator.dispose();

  environmentScene.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    object.material.dispose();
  });

  return environmentTarget;
}

export function addStudioLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe5e7e5, 1.35));

  const key = new THREE.RectAreaLight(0xffffff, 6.2, 5, 10);
  key.position.set(5, 8, 9);
  key.lookAt(0, 2.5, 0);
  scene.add(key);

  const fill = new THREE.RectAreaLight(0xffe8e3, 3.7, 4, 8);
  fill.position.set(-6, 3, 7);
  fill.lookAt(0, 1.5, 0);
  scene.add(fill);

  const rim = new THREE.RectAreaLight(0xe0f2f0, 4.4, 3, 8);
  rim.position.set(4, 7, -7);
  rim.lookAt(0, 3, 0);
  scene.add(rim);

  const lowerFill = new THREE.PointLight(0xffffff, 13, 22, 2);
  lowerFill.position.set(0, -6, 5);
  scene.add(lowerFill);
}
