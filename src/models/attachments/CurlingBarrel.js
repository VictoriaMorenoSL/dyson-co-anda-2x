import * as THREE from 'three';
import { PRODUCT } from '../../config/productConfig.js';

// Geometría aprobada del rizador maestro. Se conserva sin cambios visuales.
export function createCurlingBarrel(materials) {
  const { height, radius, capHeight, pinHeight, pinRadius } = PRODUCT.attachment;
  const group = new THREE.Group();
  group.name = 'curlingBarrel';

  const half = height / 2;
  const barrelProfile = [
    new THREE.Vector2(radius * 0.9, -half),
    new THREE.Vector2(radius * 0.97, -half + 0.11),
    new THREE.Vector2(radius, -half + 0.22),
    new THREE.Vector2(radius, half - 0.18),
    new THREE.Vector2(radius * 0.985, half - 0.08),
    new THREE.Vector2(radius * 0.92, half),
  ];
  const barrelGeometry = new THREE.LatheGeometry(barrelProfile, 96);
  barrelGeometry.computeVertexNormals();
  const barrel = new THREE.Mesh(barrelGeometry, materials.barrelGraphite);
  barrel.name = 'curlingBarrelShell';
  group.add(barrel);

  const ribCount = 12;
  const ribGeometry = new THREE.CapsuleGeometry(0.015, height - 0.48, 3, 7);
  const ribs = new THREE.InstancedMesh(ribGeometry, materials.barrelFlutes, ribCount);
  const transform = new THREE.Object3D();
  for (let i = 0; i < ribCount; i += 1) {
    const angle = (i / ribCount) * Math.PI * 2;
    transform.position.set(Math.sin(angle) * (radius + 0.002), 0, Math.cos(angle) * (radius + 0.002));
    transform.updateMatrix();
    ribs.setMatrixAt(i, transform.matrix);
  }
  ribs.name = 'longitudinalFlutes';
  ribs.instanceMatrix.needsUpdate = true;
  group.add(ribs);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.89, radius * 0.92, capHeight, 80),
    materials.barrelFlutes,
  );
  topCap.position.y = height / 2 + capHeight / 2 - 0.02;
  group.add(topCap);

  const lowerCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.88, radius * 0.95, 0.18, 80),
    materials.barrelFlutes,
  );
  lowerCollar.position.y = -height / 2 + 0.035;
  group.add(lowerCollar);

  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(pinRadius, pinRadius * 1.04, pinHeight, 48),
    materials.copper,
  );
  pin.position.y = height / 2 + capHeight + pinHeight / 2 - 0.04;
  group.add(pin);

  return group;
}

export function createNormalizedCurlingBarrel(materials) {
  const attachment = new THREE.Group();
  attachment.name = 'attachment-curling';
  attachment.userData.attachmentKey = 'curling';
  attachment.userData.visualHeight = PRODUCT.attachment.height + PRODUCT.attachment.pinHeight;

  const approvedModel = createCurlingBarrel(materials);
  approvedModel.position.y = PRODUCT.attachment.height / 2;
  attachment.add(approvedModel);
  return attachment;
}
