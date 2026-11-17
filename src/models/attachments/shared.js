import * as THREE from 'three';
import { PRODUCT } from '../../config/productConfig.js';

export function createAttachmentBase(materials, radius = PRODUCT.attachment.radius * 0.9) {
  const base = new THREE.Group();
  base.name = 'normalizedConnection';

  const socket = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.84, radius * 0.92, 0.22, 56),
    materials.graphiteSoft,
  );
  socket.position.y = 0.11;
  base.add(socket);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.94, radius, 0.16, 64),
    materials.graphite,
  );
  collar.position.y = 0.25;
  base.add(collar);

  return base;
}

export function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

export function createCapsuleShape(width, height) {
  return createRoundedRectShape(width, height, width / 2);
}

export function addCapsulePath(path, width, height) {
  addRoundedRectPath(path, width, height, width / 2);
}

export function addRoundedRectPath(path, width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
}
