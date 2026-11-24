import * as THREE from 'three';
import { PRODUCT } from '../config/productConfig.js';
import { createProductMaterials } from './materials.js';
import { createMainBody } from './MainBody.js';
import { createConnector } from './Connector.js';
import { createAttachmentCatalog } from './attachments/index.js';
import { AttachmentManager } from './AttachmentManager.js';

function applyVector(target, value) {
  if (!value) return;
  if (Array.isArray(value)) target.set(...value);
  else if (typeof value === 'number') target.setScalar(value);
  else target.copy(value);
}

export function createAirwrap() {
  const productGroup = new THREE.Group();
  productGroup.name = 'productGroup';

  const materials = createProductMaterials();
  const mainBody = createMainBody(materials);
  const connector = createConnector(materials);

  const bodyTop = PRODUCT.body.height / 2;
  connector.position.y = bodyTop + PRODUCT.connector.height / 2 + 0.055;

  // Este grupo funciona como punto de anclaje para accesorios futuros.
  const attachmentAnchor = new THREE.Group();
  attachmentAnchor.name = 'attachmentAnchor';
  attachmentAnchor.position.y = bodyTop + PRODUCT.connector.height + 0.045;

  const attachments = createAttachmentCatalog(materials);
  const attachmentManager = new AttachmentManager(attachmentAnchor, attachments, 'curling');

  function disposeProduct() {
    attachmentManager.dispose();
    const geometries = new Set();
    const productMaterials = new Set(Object.values(materials));
    const textures = new Set();
    productGroup.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        if (!material) return;
        productMaterials.add(material);
        Object.values(material).forEach((value) => {
          if (value?.isTexture) textures.add(value);
        });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    productMaterials.forEach((material) => material.dispose());
  }

  productGroup.add(mainBody, connector, attachmentAnchor);
  const modelApi = {
    object3D: productGroup,
    attachmentAnchor,
    attachmentKeys: [...attachments.keys()],
    setAttachment: (key, options) => attachmentManager.setActive(key, options),
    getActiveAttachment: () => attachmentManager.activeKey,
    onAttachmentChange: (listener) => attachmentManager.onChange(listener),
    setTransform({ position, rotation, scale } = {}) {
      applyVector(productGroup.position, position);
      applyVector(productGroup.rotation, rotation);
      applyVector(productGroup.scale, scale);
      return modelApi;
    },
    dispose: disposeProduct,
  };
  productGroup.userData = { mainBody, connector, attachmentAnchor, materials, model: modelApi };

  // Compensa visualmente el filtro inferior para centrar el conjunto completo.
  productGroup.position.y = 0.45;
  productGroup.rotation.y = -0.22;

  return productGroup;
}
