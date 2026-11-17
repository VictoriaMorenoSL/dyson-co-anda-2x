import * as THREE from 'three';
import { createAttachmentBase } from './shared.js';

// Prueba geométrica temporal: permite evaluar el volumen sin contraste grafito.
const USE_UNIFORM_COPPER_HEAD = true;

function addCapsuleContour(path, width, height, clockwise = false) {
  const x = -width / 2;
  const y = -height / 2;
  const radius = width / 2;
  if (!clockwise) {
    path.moveTo(0, y);
    path.quadraticCurveTo(x + width, y, x + width, y + radius);
    path.lineTo(x + width, y + height - radius);
    path.quadraticCurveTo(x + width, y + height, 0, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - radius);
    path.lineTo(x, y + radius);
    path.quadraticCurveTo(x, y, 0, y);
  } else {
    path.moveTo(0, y);
    path.quadraticCurveTo(x, y, x, y + radius);
    path.lineTo(x, y + height - radius);
    path.quadraticCurveTo(x, y + height, 0, y + height);
    path.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    path.lineTo(x + width, y + radius);
    path.quadraticCurveTo(x + width, y, 0, y);
  }
  path.closePath();
}

function createRingGeometry({
  outerWidth,
  outerHeight,
  openingWidth,
  openingHeight,
  depth,
  bevelSize,
  bevelThickness,
  bevelSegments = 5,
}) {
  const shape = new THREE.Shape();
  addCapsuleContour(shape, outerWidth, outerHeight);
  const opening = new THREE.Path();
  addCapsuleContour(opening, openingWidth, openingHeight, true);
  shape.holes.push(opening);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments,
    bevelSize,
    bevelThickness,
    curveSegments: 48,
  });
  geometry.center();
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function assignHeadSurfaceColors(
  geometry,
  { outerWidth, outerHeight, openingWidth, openingHeight },
) {
  const positions = geometry.attributes.position;
  const triangleCount = positions.count / 3;
  const outerRadius = outerWidth / 2;
  const innerRadius = openingWidth / 2;
  const outerStraightHalf = (outerHeight - outerWidth) / 2;
  const innerStraightHalf = (openingHeight - openingWidth) / 2;
  geometry.computeBoundingBox();
  geometry.clearGroups();

  const triangleMaterial = (triangle) => {
    const offset = triangle * 3;
    const a = new THREE.Vector3().fromBufferAttribute(positions, offset);
    const b = new THREE.Vector3().fromBufferAttribute(positions, offset + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, offset + 2);
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();

    // La cara frontal es cobriza; la posterior pertenece al acabado grafito.
    if (Math.abs(normal.z) > 0.8) return centroid.z > 0 ? 0 : 1;

    const distanceToCapsule = (straightHalf) => {
      const centerY = THREE.MathUtils.clamp(centroid.y, -straightHalf, straightHalf);
      return Math.hypot(centroid.x, centroid.y - centerY);
    };
    const outerDistance = Math.abs(distanceToCapsule(outerStraightHalf) - outerRadius);
    const innerDistance = Math.abs(distanceToCapsule(innerStraightHalf) - innerRadius);

    // Las paredes del conducto conservan cobre; solo el lateral exterior es negro.
    return innerDistance < outerDistance ? 0 : 1;
  };

  const copper = new THREE.Color(0xc98680);
  const graphite = new THREE.Color(0x171818);
  const colors = [];
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const color = triangleMaterial(triangle) === 0 ? copper : graphite;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      colors.push(color.r, color.g, color.b);
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.addGroup(0, positions.count, 0);
}

function createHousingTransition(material) {
  const sections = [
    { y: 0.24, radiusX: 0.47, radiusZ: 0.43 },
    { y: 0.32, radiusX: 0.5, radiusZ: 0.44 },
    { y: 0.43, radiusX: 0.54, radiusZ: 0.45 },
    { y: 0.54, radiusX: 0.6, radiusZ: 0.45 },
  ];
  const radialSegments = 48;
  const positions = [];
  const indices = [];

  sections.forEach((section) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * section.radiusX,
        section.y,
        Math.sin(angle) * section.radiusZ,
      );
    }
  });

  for (let row = 0; row < sections.length - 1; row += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      const a = row * radialSegments + segment;
      const b = row * radialSegments + nextSegment;
      const c = (row + 1) * radialSegments + segment;
      const d = (row + 1) * radialSegments + nextSegment;
      indices.push(a, c, b, b, c, d);
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, sections[0].y, 0);
  const topCenter = positions.length / 3;
  positions.push(0, sections[sections.length - 1].y, 0);
  const topStart = (sections.length - 1) * radialSegments;
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const nextSegment = (segment + 1) % radialSegments;
    indices.push(bottomCenter, segment, nextSegment);
    indices.push(topCenter, topStart + nextSegment, topStart + segment);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const transition = new THREE.Mesh(geometry, material);
  transition.name = 'housingTransition';
  return transition;
}

export function createFastDryer(materials) {
  const attachment = new THREE.Group();
  attachment.name = 'attachment-fast-dryer';
  attachment.userData.attachmentKey = 'fastDryer';
  attachment.userData.visualHeight = 3.22;
  attachment.add(createAttachmentBase(materials, 0.56));

  const headGeometry = createRingGeometry({
    outerWidth: 1.38,
    outerHeight: 2.74,
    openingWidth: 0.72,
    openingHeight: 2.08,
    depth: 0.38,
    bevelSize: 0.04,
    bevelThickness: 0.09,
    bevelSegments: 6,
  });
  if (!USE_UNIFORM_COPPER_HEAD) {
    assignHeadSurfaceColors(headGeometry, {
      outerWidth: 1.38,
      outerHeight: 2.74,
      openingWidth: 0.72,
      openingHeight: 2.08,
    });
  }
  const headCopper = materials.attachmentCopper.clone();
  headCopper.name = 'continuousFastDryerCopper';
  headCopper.color.copy(materials.attachmentCopper.color);
  headCopper.vertexColors = !USE_UNIFORM_COPPER_HEAD;
  if (headCopper.vertexColors) headCopper.color.setHex(0xffffff);
  headCopper.metalness = 0.42;
  headCopper.roughness = 0.38;
  headCopper.envMapIntensity = 1.25;
  headCopper.emissive.setHex(0x000000);
  headCopper.emissiveIntensity = 0;
  const head = new THREE.Mesh(headGeometry, headCopper);
  head.name = 'hollowCopperLoop';
  head.position.y = 1.72;
  attachment.add(head);

  attachment.add(createHousingTransition(materials.graphite));

  return attachment;
}
