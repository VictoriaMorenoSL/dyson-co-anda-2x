const DESKTOP_POSITION = { x: 0.65, y: 0.44 };
const STATIC_POSITION = { x: 0.66, y: 0.43 };

export function createReactiveHeroBackground({ stage, glow }) {
  if (!stage || !glow) return () => {};

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stageRect = stage.getBoundingClientRect();
  let glowSize = glow.getBoundingClientRect().width;
  let targetX = stageRect.width * DESKTOP_POSITION.x;
  let targetY = stageRect.height * DESKTOP_POSITION.y;
  let currentX = targetX;
  let currentY = targetY;
  let frameId = 0;
  let idleTimer = 0;
  let trackingEnabled = false;

  function render() {
    glow.style.transform = `translate3d(${currentX - glowSize / 2}px, ${currentY - glowSize / 2}px, 0)`;
  }

  function animate() {
    currentX += (targetX - currentX) * 0.085;
    currentY += (targetY - currentY) * 0.085;
    render();

    if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
      frameId = window.requestAnimationFrame(animate);
    } else {
      currentX = targetX;
      currentY = targetY;
      render();
      frameId = 0;
    }
  }

  function startAnimation() {
    if (!frameId) frameId = window.requestAnimationFrame(animate);
  }

  function setStaticPosition() {
    stageRect = stage.getBoundingClientRect();
    glowSize = glow.getBoundingClientRect().width;
    targetX = stageRect.width * STATIC_POSITION.x;
    targetY = stageRect.height * STATIC_POSITION.y;
    currentX = targetX;
    currentY = targetY;
    glow.classList.add('is-resting');
    render();
  }

  function handlePointerMove(event) {
    stageRect = stage.getBoundingClientRect();
    const insideStage = event.clientX >= stageRect.left
      && event.clientX <= stageRect.right
      && event.clientY >= stageRect.top
      && event.clientY <= stageRect.bottom;

    if (!insideStage) return;

    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    const normalizedX = (pointerX / stageRect.width - 0.5) * 2;
    const normalizedY = (pointerY / stageRect.height - 0.5) * 2;
    const horizontalTravel = Math.min(160, stageRect.width * 0.12);
    const verticalTravel = Math.min(110, stageRect.height * 0.14);

    targetX = stageRect.width * DESKTOP_POSITION.x + normalizedX * horizontalTravel;
    targetY = stageRect.height * DESKTOP_POSITION.y + normalizedY * verticalTravel;
    glow.classList.remove('is-resting');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => glow.classList.add('is-resting'), 480);
    startAnimation();
  }

  function enableTracking() {
    if (trackingEnabled) return;
    trackingEnabled = true;
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
  }

  function disableTracking() {
    if (!trackingEnabled) return;
    trackingEnabled = false;
    window.removeEventListener('pointermove', handlePointerMove);
  }

  function applyInputMode() {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    window.clearTimeout(idleTimer);

    if (finePointer.matches && !reducedMotion.matches) {
      glow.classList.remove('is-resting');
      stageRect = stage.getBoundingClientRect();
      glowSize = glow.getBoundingClientRect().width;
      targetX = stageRect.width * DESKTOP_POSITION.x;
      targetY = stageRect.height * DESKTOP_POSITION.y;
      currentX = targetX;
      currentY = targetY;
      render();
      enableTracking();
      return;
    }

    disableTracking();
    setStaticPosition();
  }

  function handleResize() {
    stageRect = stage.getBoundingClientRect();
    glowSize = glow.getBoundingClientRect().width;

    if (!trackingEnabled) {
      setStaticPosition();
      return;
    }

    targetX = Math.min(Math.max(targetX, 0), stageRect.width);
    targetY = Math.min(Math.max(targetY, 0), stageRect.height);
    currentX = Math.min(Math.max(currentX, 0), stageRect.width);
    currentY = Math.min(Math.max(currentY, 0), stageRect.height);
    render();
  }

  applyInputMode();
  window.addEventListener('resize', handleResize, { passive: true });
  finePointer.addEventListener('change', applyInputMode);
  reducedMotion.addEventListener('change', applyInputMode);

  return () => {
    disableTracking();
    window.cancelAnimationFrame(frameId);
    window.clearTimeout(idleTimer);
    window.removeEventListener('resize', handleResize);
    finePointer.removeEventListener('change', applyInputMode);
    reducedMotion.removeEventListener('change', applyInputMode);
  };
}
