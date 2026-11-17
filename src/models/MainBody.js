import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PRODUCT } from '../config/productConfig.js';

function createControlPanel(materials) {
  const group = new THREE.Group();
  group.name = 'controlPanel';

  const surface = PRODUCT.body.radius;
  const buttonRadius = 0.155;
  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(buttonRadius, buttonRadius, 0.055, 64),
    materials.darkCopper,
  );
  button.rotation.x = Math.PI / 2;
  button.position.set(0, 1.42, surface + 0.012);
  group.add(button);

  const buttonInset = new THREE.Mesh(
    new THREE.SphereGeometry(buttonRadius * 0.76, 40, 20),
    materials.bodyWarm,
  );
  buttonInset.position.copy(button.position);
  buttonInset.scale.z = 0.22;
  buttonInset.position.z += 0.035;
  group.add(buttonInset);

  const powerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.057, 0.009, 8, 40, Math.PI * 1.72),
    materials.graphiteSoft,
  );
  powerRing.rotation.z = -Math.PI * 0.36;
  powerRing.position.set(0, 1.42, surface + 0.083);
  group.add(powerRing);

  const powerStem = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.072, 0.012), materials.graphiteSoft);
  powerStem.position.set(0, 1.475, surface + 0.088);
  group.add(powerStem);

  const indicatorBacking = new THREE.Mesh(
    new RoundedBoxGeometry(0.14, 0.4, 0.045, 5, 0.055),
    materials.graphiteSoft,
  );
  indicatorBacking.position.set(0, 0.83, surface + 0.018);
  group.add(indicatorBacking);

  const indicatorGeometry = new RoundedBoxGeometry(0.072, 0.315, 0.03, 5, 0.03);
  const indicator = new THREE.Mesh(indicatorGeometry, materials.indicator);
  indicator.position.set(0, 0.83, surface + 0.055);
  group.add(indicator);

  [-0.145, 0.145].forEach((x, index) => {
    const lowerButton = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 24, 14),
      index === 1 ? materials.darkCopper : materials.bodyWarm,
    );
    lowerButton.position.set(x, -1.66, surface + 0.025);
    lowerButton.scale.z = 0.22;
    group.add(lowerButton);

    [-0.035, 0, 0.035].forEach((offset) => {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6), materials.graphiteSoft);
      led.position.set(x + offset, -1.52, surface + 0.055);
      group.add(led);
    });
  });

  return group;
}

function createFilter(materials) {
  const { height, radius } = PRODUCT.filter;
  const group = new THREE.Group();
  group.name = 'filterAssembly';

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.89, radius * 0.91, height - 0.08, 64),
    materials.graphite,
  );
  group.add(core);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = 512;
  maskCanvas.height = 256;
  const context = maskCanvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  context.fillStyle = '#000000';
  const columns = 26;
  const rows = 13;
  const cellWidth = maskCanvas.width / columns;
  const cellHeight = maskCanvas.height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5 + (row % 2) * 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      context.beginPath();
      context.ellipse(x, y, cellWidth * 0.22, cellHeight * 0.29, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  const perforationMask = new THREE.CanvasTexture(maskCanvas);
  perforationMask.colorSpace = THREE.NoColorSpace;
  perforationMask.anisotropy = 4;
  const shellMaterial = materials.filterShell.clone();
  shellMaterial.alphaMap = perforationMask;
  shellMaterial.alphaTest = 0.46;
  shellMaterial.transparent = false;
  shellMaterial.needsUpdate = true;

  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.015, height, 96, 1, true),
    shellMaterial,
  );
  shell.name = 'perforatedFilterShell';
  group.add(shell);

  [-height / 2 + 0.03, height / 2 - 0.03].forEach((y) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.985, 0.025, 8, 80), materials.darkCopper);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    group.add(rim);
  });

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.69, radius * 0.93, 0.46, 64),
    materials.graphite,
  );
  base.position.y = -height / 2 - 0.2;
  group.add(base);

  return group;
}

export function createMainBody(materials) {
  const { body } = PRODUCT;
  const group = new THREE.Group();
  group.name = 'mainBody';

  const half = body.height / 2;
  const profile = [
    new THREE.Vector2(body.baseRadius * 0.94, -half),
    new THREE.Vector2(body.baseRadius, -half + 0.14),
    new THREE.Vector2(body.radius * 1.015, -half + 0.38),
    new THREE.Vector2(body.radius, -half + 1.35),
    new THREE.Vector2(body.radius * 0.985, 0),
    new THREE.Vector2(body.radius * 0.992, half - 1.1),
    new THREE.Vector2(body.radius * 1.01, half - 0.38),
    new THREE.Vector2(body.shoulderRadius, half),
  ];
  const geometry = new THREE.LatheGeometry(profile, body.segments);
  geometry.computeVertexNormals();
  const shell = new THREE.Mesh(geometry, materials.body);
  shell.name = 'bodyShell';
  group.add(shell);
  group.add(createControlPanel(materials));

  const filter = createFilter(materials);
  filter.position.y = -half - PRODUCT.filter.height / 2 + 0.02;
  group.add(filter);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(body.shoulderRadius * 0.92, body.shoulderRadius, 0.2, 64),
    materials.bodyWarm,
  );
  neck.position.y = half + 0.055;
  group.add(neck);

  return group;
}
