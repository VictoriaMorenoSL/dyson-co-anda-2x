import * as THREE from 'three';
import { createAttachmentBase } from './shared.js';

const ARM_SECTIONS = Object.freeze([
  // X = ancho frontal, Y = altura. Cada brazo es un sector del mismo cilindro.
  // La primera sección queda embebida en la base para formar una unión continua.
  { y: 0.79, inner: 0.27, outer: 0.66 },
  { y: 1.03, inner: 0.29, outer: 0.75 },
  { y: 1.55, inner: 0.29, outer: 0.76 },
  { y: 2.55, inner: 0.29, outer: 0.76 },
  { y: 3.03, inner: 0.3, outer: 0.76 },
  { y: 3.3, inner: 0.37, outer: 0.75 },
  { y: 3.58, inner: 0.5, outer: 0.74 },
  { y: 3.9, inner: 0.675, outer: 0.73 },
]);

function createLoftedArmGeometry(side, arcSegments = 18) {
  const positions = [];
  const indices = [];
  const verticesPerSection = (arcSegments + 1) * 2;

  ARM_SECTIONS.forEach((section) => {
    const availableWidth = section.outer - section.inner;
    const wallThickness = Math.min(0.16, availableWidth * 0.55);
    const innerRadius = section.outer - wallThickness;
    const outerAngle = Math.acos(section.inner / section.outer);
    const innerAngle = Math.acos(Math.min(section.inner / innerRadius, 0.999));
    for (let segment = 0; segment <= arcSegments; segment += 1) {
      const angle = -outerAngle + (segment / arcSegments) * outerAngle * 2;
      const x = side * Math.cos(angle) * section.outer;
      const z = Math.sin(angle) * section.outer;
      positions.push(x, section.y, z);
    }
    for (let segment = 0; segment <= arcSegments; segment += 1) {
      const angle = innerAngle - (segment / arcSegments) * innerAngle * 2;
      const x = side * Math.cos(angle) * innerRadius;
      const z = Math.sin(angle) * innerRadius;
      positions.push(x, section.y, z);
    }
  });

  for (let row = 0; row < ARM_SECTIONS.length - 1; row += 1) {
    for (let segment = 0; segment < verticesPerSection; segment += 1) {
      const nextSegment = (segment + 1) % verticesPerSection;
      const a = row * verticesPerSection + segment;
      const b = row * verticesPerSection + nextSegment;
      const c = (row + 1) * verticesPerSection + segment;
      const d = (row + 1) * verticesPerSection + nextSegment;
      if (side > 0) indices.push(a, c, b, b, c, d);
      else indices.push(a, b, c, b, d, c);
    }
  }

  // Las tapas usan vértices independientes para que sus normales no deformen
  // el sombreado de las paredes curvas. La retícula evita triángulos largos o
  // degenerados en las puntas estrechas.
  const addCap = (sectionIndex, expectedNormalY) => {
    const sourceStart = sectionIndex * verticesPerSection;
    const capStart = positions.length / 3;
    for (let vertex = 0; vertex < verticesPerSection; vertex += 1) {
      const source = (sourceStart + vertex) * 3;
      positions.push(positions[source], positions[source + 1], positions[source + 2]);
    }

    const pushOrientedTriangle = (a, b, c) => {
      const ia = a * 3;
      const ib = b * 3;
      const ic = c * 3;
      const abX = positions[ib] - positions[ia];
      const abZ = positions[ib + 2] - positions[ia + 2];
      const acX = positions[ic] - positions[ia];
      const acZ = positions[ic + 2] - positions[ia + 2];
      const normalY = abZ * acX - abX * acZ;
      if (normalY * expectedNormalY >= 0) indices.push(a, b, c);
      else indices.push(a, c, b);
    };

    const innerStart = arcSegments + 1;
    for (let segment = 0; segment < arcSegments; segment += 1) {
      const outerA = capStart + segment;
      const outerB = capStart + segment + 1;
      const innerA = capStart + innerStart + (arcSegments - segment);
      const innerB = capStart + innerStart + (arcSegments - segment - 1);
      pushOrientedTriangle(outerA, outerB, innerA);
      pushOrientedTriangle(outerB, innerB, innerA);
    }
  };

  addCap(0, -1);
  addCap(ARM_SECTIONS.length - 1, 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createInteriorLinerGeometry(side) {
  const positions = [];
  const indices = [];
  const verticesPerSection = 4;

  ARM_SECTIONS.forEach((section) => {
    const availableWidth = section.outer - section.inner;
    const wallThickness = Math.min(0.16, availableWidth * 0.55);
    const innerRadius = section.outer - wallThickness;
    const halfDepth = Math.max(
      0.045,
      Math.sqrt(Math.max(innerRadius * innerRadius - section.inner * section.inner, 0)) - 0.018,
    );
    const linerThickness = Math.min(0.075, availableWidth * 0.35);
    const innerX = side * section.inner;
    const outerX = side * (section.inner + linerThickness);
    const outerDepth = Math.max(0.035, halfDepth - 0.018);

    positions.push(
      innerX, section.y, -halfDepth,
      innerX, section.y, halfDepth,
      outerX, section.y, outerDepth,
      outerX, section.y, -outerDepth,
    );
  });

  const pushTriangle = (a, b, c, expectedNormal) => {
    const read = (index) => new THREE.Vector3(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    );
    const pa = read(a);
    const normal = read(b).sub(pa).cross(read(c).sub(pa));
    if (normal.dot(expectedNormal) >= 0) indices.push(a, b, c);
    else indices.push(a, c, b);
  };

  const pushQuad = (a, b, c, d, expectedNormal) => {
    pushTriangle(a, b, c, expectedNormal);
    pushTriangle(a, c, d, expectedNormal);
  };

  const edgeNormals = [
    new THREE.Vector3(-side, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(side, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ];
  for (let row = 0; row < ARM_SECTIONS.length - 1; row += 1) {
    const current = row * verticesPerSection;
    const next = (row + 1) * verticesPerSection;
    for (let edge = 0; edge < verticesPerSection; edge += 1) {
      const edgeNext = (edge + 1) % verticesPerSection;
      pushQuad(
        current + edge,
        current + edgeNext,
        next + edgeNext,
        next + edge,
        edgeNormals[edge],
      );
    }
  }

  pushQuad(0, 3, 2, 1, new THREE.Vector3(0, -1, 0));
  const top = (ARM_SECTIONS.length - 1) * verticesPerSection;
  pushQuad(top, top + 1, top + 2, top + 3, new THREE.Vector3(0, 1, 0));

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addRoundedRectPath(path, width, height, radius, clockwise = false) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  if (!clockwise) {
    path.moveTo(x + r, y);
    path.lineTo(x + width - r, y);
    path.quadraticCurveTo(x + width, y, x + width, y + r);
    path.lineTo(x + width, y + height - r);
    path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    path.lineTo(x + r, y + height);
    path.quadraticCurveTo(x, y + height, x, y + height - r);
    path.lineTo(x, y + r);
    path.quadraticCurveTo(x, y, x + r, y);
  } else {
    path.moveTo(x + r, y);
    path.quadraticCurveTo(x, y, x, y + r);
    path.lineTo(x, y + height - r);
    path.quadraticCurveTo(x, y + height, x + r, y + height);
    path.lineTo(x + width - r, y + height);
    path.quadraticCurveTo(x + width, y + height, x + width, y + height - r);
    path.lineTo(x + width, y + r);
    path.quadraticCurveTo(x + width, y, x + width - r, y);
    path.lineTo(x + r, y);
  }
  path.closePath();
}

function createRoundedPanelGeometry(width, height, depth, radius) {
  const shape = new THREE.Shape();
  addRoundedRectPath(shape, width, height, radius);
  const bevel = Math.min(radius * 0.35, depth * 0.25);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: bevel > 0,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.computeVertexNormals();
  return geometry;
}

function createVentChannel(side, materials) {
  const channel = new THREE.Group();
  channel.name = side < 0 ? 'leftInnerVent' : 'rightInnerVent';

  const frameShape = new THREE.Shape();
  addRoundedRectPath(frameShape, 0.16, 1.42, 0.065);
  const opening = new THREE.Path();
  addRoundedRectPath(opening, 0.065, 1.2, 0.028, true);
  frameShape.holes.push(opening);

  const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.045,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.008,
  });
  frameGeometry.computeVertexNormals();
  const frame = new THREE.Mesh(frameGeometry, materials.graphiteSoft);
  frame.name = 'recessedVentContour';
  channel.add(frame);

  const cavity = new THREE.Mesh(
    createRoundedPanelGeometry(0.062, 1.18, 0.016, 0.021),
    materials.barrelFlutes,
  );
  cavity.name = 'ventOpening';
  cavity.position.z = 0.029;
  channel.add(cavity);

  for (let ribIndex = 0; ribIndex < 5; ribIndex += 1) {
    const rib = new THREE.Mesh(
      createRoundedPanelGeometry(0.052, 0.025, 0.018, 0.008),
      materials.graphiteSoft,
    );
    rib.name = `ventRib-${ribIndex + 1}`;
    rib.position.set(0, -0.4 + ribIndex * 0.2, 0.04);
    channel.add(rib);
  }

  // La cara visible del canal queda casi enrasada con el plano frontal del
  // brazo; su base penetra la pared y el contorno sobresale solo lo necesario.
  const x = side * 0.34;
  channel.position.set(x, 2.04, 0.635);
  return channel;
}

function createStructuralBase(materials) {
  const sections = [
    { y: 0.25, radiusX: 0.6, radiusZ: 0.6 },
    { y: 0.34, radiusX: 0.64, radiusZ: 0.59 },
    { y: 0.44, radiusX: 0.68, radiusZ: 0.59 },
    { y: 0.65, radiusX: 0.68, radiusZ: 0.6 },
    { y: 0.78, radiusX: 0.66, radiusZ: 0.61 },
    // Solapa los brazos 0.10 unidades para que no aparezca una junta abierta.
    { y: 0.89, radiusX: 0.67, radiusZ: 0.62 },
  ];
  const radialSegments = 40;
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
  const base = new THREE.Mesh(geometry, materials.graphite);
  base.name = 'structuralBase';
  return base;
}

export function createAirSmooth(materials) {
  const attachment = new THREE.Group();
  attachment.name = 'attachment-air-smooth';
  attachment.userData.attachmentKey = 'airSmooth';
  attachment.userData.visualHeight = 3.94;
  attachment.add(createAttachmentBase(materials, 0.72));

  const interiorSilver = materials.barrelGraphite.clone();
  interiorSilver.name = 'airSmoothInteriorSilver';
  interiorSilver.color.setHex(0x656b6a);
  interiorSilver.metalness = 0.46;
  interiorSilver.roughness = 0.38;
  interiorSilver.clearcoat = 0.08;
  interiorSilver.clearcoatRoughness = 0.56;
  interiorSilver.specularIntensity = 0.72;
  interiorSilver.envMapIntensity = 0.86;

  [-1, 1].forEach((side) => {
    const geometry = createLoftedArmGeometry(side);
    const arm = new THREE.Mesh(geometry, materials.barrelGraphite);
    arm.name = side < 0 ? 'leftAirSurface' : 'rightAirSurface';
    attachment.add(arm);

    const liner = new THREE.Mesh(createInteriorLinerGeometry(side), interiorSilver);
    liner.name = side < 0 ? 'leftInteriorLiner' : 'rightInteriorLiner';
    attachment.add(liner);

    attachment.add(createVentChannel(side, materials));
  });

  attachment.add(createStructuralBase(materials));

  const innerFloor = new THREE.Mesh(
    createRoundedPanelGeometry(0.5, 0.12, 0.28, 0.04),
    materials.graphiteSoft,
  );
  innerFloor.name = 'openingBridge';
  innerFloor.position.set(0, 0.87, -0.14);
  attachment.add(innerFloor);

  return attachment;
}
