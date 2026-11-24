import { gsap } from 'gsap';

function cloneTransitionMaterials(attachment) {
  const materialClones = new Map();
  attachment.traverse((object) => {
    if (!object.isMesh) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const clonedMaterials = sourceMaterials.map((source) => {
      if (!materialClones.has(source)) {
        const clone = source.clone();
        clone.userData.modelBaseOpacity = source.opacity;
        clone.transparent = true;
        clone.opacity = 1;
        materialClones.set(source, clone);
      }
      return materialClones.get(source);
    });
    object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
  });
  attachment.userData.transitionMaterials = [...materialClones.values()];
}

function setOpacity(attachment, opacity) {
  attachment.userData.transitionMaterials.forEach((material) => {
    material.opacity = opacity;
    material.depthWrite = opacity > 0.92;
  });
}

export class AttachmentManager {
  constructor(anchor, attachments, initialKey = 'curling') {
    this.anchor = anchor;
    this.attachments = attachments;
    this.activeKey = initialKey;
    this.pendingKey = null;
    this.timeline = null;
    this.listeners = new Set();

    attachments.forEach((attachment) => {
      cloneTransitionMaterials(attachment);
      attachment.position.set(0, 0, 0);
      attachment.scale.setScalar(1);
      setOpacity(attachment, 1);
    });

    this.activeAttachment = attachments.get(initialKey);
    this.activeAttachment.name = 'activeAttachment';
    anchor.add(this.activeAttachment);
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emitChange() {
    this.listeners.forEach((listener) => listener(this.activeKey, this.activeAttachment));
  }

  setActive(key, { animate = true } = {}) {
    if (!this.attachments.has(key)) {
      return Promise.reject(new Error(`Accesorio desconocido: ${key}`));
    }
    if (key === this.activeKey && !this.timeline) return Promise.resolve(this.activeAttachment);
    if (this.timeline) {
      this.pendingKey = key;
      return Promise.resolve(this.attachments.get(key));
    }
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.swapImmediately(key);
      return Promise.resolve(this.activeAttachment);
    }
    return this.animateSwap(key);
  }

  swapImmediately(key) {
    this.anchor.remove(this.activeAttachment);
    this.activeAttachment = this.attachments.get(key);
    this.activeKey = key;
    this.activeAttachment.name = 'activeAttachment';
    this.activeAttachment.position.set(0, 0, 0);
    this.activeAttachment.scale.setScalar(1);
    setOpacity(this.activeAttachment, 1);
    this.anchor.add(this.activeAttachment);
    this.emitChange();
  }

  animateSwap(key) {
    const outgoing = this.activeAttachment;
    const incoming = this.attachments.get(key);
    const outgoingFade = { value: 1 };
    const incomingFade = { value: 0 };

    incoming.position.set(0, 0.72, 0);
    incoming.scale.setScalar(0.985);
    setOpacity(incoming, 0);

    return new Promise((resolve) => {
      this.timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        onComplete: () => {
          this.timeline = null;
          this.activeKey = key;
          this.activeAttachment = incoming;
          this.emitChange();
          resolve(incoming);

          const queuedKey = this.pendingKey;
          this.pendingKey = null;
          if (queuedKey && queuedKey !== this.activeKey) this.setActive(queuedKey);
        },
      });

      this.timeline
        .to(outgoing.position, { y: 0.72, duration: 0.34 }, 0)
        .to(outgoing.scale, { x: 0.985, y: 0.985, z: 0.985, duration: 0.28 }, 0)
        .to(outgoingFade, {
          value: 0,
          duration: 0.26,
          onUpdate: () => setOpacity(outgoing, outgoingFade.value),
        }, 0.08)
        .call(() => {
          this.anchor.remove(outgoing);
          outgoing.position.set(0, 0, 0);
          outgoing.scale.setScalar(1);
          setOpacity(outgoing, 1);
          incoming.name = 'activeAttachment';
          this.anchor.add(incoming);
        })
        .to(incoming.position, { y: 0, duration: 0.44 }, '>-0.02')
        .to(incoming.scale, { x: 1, y: 1, z: 1, duration: 0.4 }, '<')
        .to(incomingFade, {
          value: 1,
          duration: 0.36,
          onUpdate: () => setOpacity(incoming, incomingFade.value),
        }, '<0.04');
    });
  }

  dispose() {
    this.timeline?.kill();
    this.timeline = null;
    this.listeners.clear();
    const geometries = new Set();
    const materials = new Set();
    this.attachments.forEach((attachment) => {
      attachment.traverse((object) => {
        if (!object.isMesh) return;
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => {
          if (material) materials.add(material);
        });
      });
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    this.attachments.clear();
  }
}
