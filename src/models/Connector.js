import * as THREE from 'three';
import { PRODUCT } from '../config/productConfig.js';

export function createConnector(materials) {
  const { height, radius } = PRODUCT.connector;
  const group = new THREE.Group();
  group.name = 'connector';

  const half = height / 2;
  const profile = [
    new THREE.Vector2(radius * 0.945, -half),
    new THREE.Vector2(radius * 0.985, -half + 0.045),
    new THREE.Vector2(radius, -half + 0.11),
    new THREE.Vector2(radius, half - 0.1),
    new THREE.Vector2(radius * 0.982, half - 0.04),
    new THREE.Vector2(radius * 0.94, half),
  ];
  const ringGeometry = new THREE.LatheGeometry(profile, 96);
  ringGeometry.computeVertexNormals();
  const ring = new THREE.Mesh(ringGeometry, materials.copper);
  ring.name = 'metalRing';
  group.add(ring);

  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.947, 0.012, 8, 80),
    materials.darkCopper,
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = height / 2 - 0.012;
  group.add(seam);

  return group;
}
