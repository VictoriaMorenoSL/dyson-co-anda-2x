import * as THREE from 'three';
import { createAttachmentBase } from './shared.js';

export function createRoundBrush(materials) {
  const attachment = new THREE.Group();
  attachment.name = 'attachment-round-brush';
  attachment.userData.attachmentKey = 'roundBrush';
  attachment.userData.visualHeight = 4.16;
  attachment.add(createAttachmentBase(materials, 0.7));

  const brushHeight = 3.34;
  const coreRadius = 0.62;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(coreRadius * 0.96, coreRadius, brushHeight, 56),
    materials.graphite,
  );
  core.name = 'brushCore';
  core.position.y = 2.0;
  attachment.add(core);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.73, 0.72, 0.3, 64),
    materials.graphiteSoft,
  );
  top.position.y = 3.78;
  attachment.add(top);

  const rowCount = 24;
  const columnCount = 20;
  const bristleCount = rowCount * columnCount;
  const bristleLength = 0.4;
  const bristleGeometry = new THREE.CylinderGeometry(0.008, 0.013, bristleLength, 5);
  const bristles = new THREE.InstancedMesh(bristleGeometry, materials.graphiteSoft, bristleCount);
  bristles.name = 'instancedBristles';

  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const radial = new THREE.Vector3();
  let instanceIndex = 0;
  for (let row = 0; row < rowCount; row += 1) {
    const y = 0.55 + (row / (rowCount - 1)) * (brushHeight - 0.28);
    for (let column = 0; column < columnCount; column += 1) {
      const angle = (column / columnCount) * Math.PI * 2 + (row % 2) * (Math.PI / columnCount);
      radial.set(Math.sin(angle), 0, Math.cos(angle));
      transform.position.copy(radial).multiplyScalar(coreRadius + bristleLength / 2 - 0.015);
      transform.position.y = y;
      transform.quaternion.setFromUnitVectors(up, radial);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      bristles.setMatrixAt(instanceIndex, transform.matrix);
      instanceIndex += 1;
    }
  }
  bristles.instanceMatrix.needsUpdate = true;
  attachment.add(bristles);

  return attachment;
}
