const NORMAL_DARK = '#292929';
const NORMAL_LIGHT = '#e6d9d4';

function parseColor(color) {
  const match = color.match(/[\d.]+/g);
  if (!match || match.length < 3) return null;
  return {
    r: Number(match[0]),
    g: Number(match[1]),
    b: Number(match[2]),
    a: match[3] === undefined ? 1 : Number(match[3]),
  };
}

function isLightColor(color) {
  const parsed = parseColor(color);
  if (!parsed || parsed.a < 0.08) return null;
  const luminance = (parsed.r * 0.2126 + parsed.g * 0.7152 + parsed.b * 0.0722) / 255;
  return luminance > 0.56;
}

export function createCustomCursor({
  cursor,
  heroStage,
  sceneContainer,
  hitTestProduct,
  isInteractionEnabled,
}) {
  if (!cursor) return () => {};

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const label = cursor.querySelector('.custom-cursor__label');
  const root = document.documentElement;
  let enabled = false;
  let visible = false;
  let dragging = false;
  let state = 'normal';
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let frameId = 0;
  let contextFrameId = 0;
  let contextRefreshUntil = 0;
  let lastPointerX = targetX;
  let lastPointerY = targetY;

  function render() {
    cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
  }

  function animatePosition() {
    const amount = reducedMotion.matches ? 1 : 0.42;
    currentX += (targetX - currentX) * amount;
    currentY += (targetY - currentY) * amount;
    render();

    if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
      frameId = window.requestAnimationFrame(animatePosition);
    } else {
      currentX = targetX;
      currentY = targetY;
      render();
      frameId = 0;
    }
  }

  function updatePosition(x, y) {
    targetX = x;
    targetY = y;
    lastPointerX = x;
    lastPointerY = y;
    if (!frameId) frameId = window.requestAnimationFrame(animatePosition);
  }

  function setVisible(nextVisible) {
    visible = nextVisible;
    cursor.classList.toggle('is-visible', nextVisible);
  }

  function setState(nextState) {
    if (state === nextState) return;
    state = nextState;
    cursor.dataset.cursorState = nextState;
    label.textContent = nextState === 'model'
      ? 'Arrastrar'
      : nextState === 'card'
        ? 'Elegir'
        : '';
  }

  function findSurfaceColor(element) {
    if (element?.closest?.('#hero-scene')) {
      return getComputedStyle(heroStage).backgroundColor;
    }

    let node = element;
    while (node && node !== document.documentElement) {
      const backgroundColor = getComputedStyle(node).backgroundColor;
      if (isLightColor(backgroundColor) !== null) return backgroundColor;
      node = node.parentElement;
    }
    return getComputedStyle(heroStage).backgroundColor;
  }

  function updateNormalColor(element) {
    const lightSurface = isLightColor(findSurfaceColor(element));
    cursor.style.setProperty('--cursor-normal-color', lightSurface ? NORMAL_DARK : NORMAL_LIGHT);
  }

  function isEditable(element) {
    return Boolean(element?.closest?.(
      'input, textarea, select, [contenteditable="true"], .technology-modal, .trailer-modal',
    ));
  }

  function updateContext(x = lastPointerX, y = lastPointerY) {
    if (!enabled || dragging) return;
    const element = document.elementFromPoint(x, y);

    if (isEditable(element)) {
      cursor.classList.add('is-native-zone');
      setVisible(false);
      return;
    }

    cursor.classList.remove('is-native-zone');
    setVisible(true);

    if (element?.closest?.('.style-card')) {
      setState('card');
      return;
    }

    if (element?.closest?.('a, button, [role="button"]')) {
      setState('link');
      return;
    }

    if (isInteractionEnabled() && hitTestProduct(x, y)) {
      setState('model');
      return;
    }

    updateNormalColor(element);
    setState('normal');
  }

  function handlePointerMove(event) {
    if (!enabled || event.pointerType === 'touch') return;
    updatePosition(event.clientX, event.clientY);
    if (!visible) setVisible(true);
    updateContext(event.clientX, event.clientY);
  }

  function handlePointerDown(event) {
    if (!enabled || event.pointerType === 'touch') return;
    if (event.target?.closest?.('a, button, [role="button"]')) return;
    if (isInteractionEnabled() && hitTestProduct(event.clientX, event.clientY)) {
      dragging = true;
      setState('dragging');
    }
  }

  function handlePointerUp(event) {
    if (!enabled || !dragging) return;
    dragging = false;
    updatePosition(event.clientX, event.clientY);
    updateContext(event.clientX, event.clientY);
  }

  function handlePointerLeave(event) {
    if (event.relatedTarget === null) setVisible(false);
  }

  function refreshContextLoop(time) {
    updateContext();
    if (time < contextRefreshUntil) {
      contextFrameId = window.requestAnimationFrame(refreshContextLoop);
    } else {
      contextFrameId = 0;
    }
  }

  function refreshContextDuringMotion(duration = 1200) {
    contextRefreshUntil = Math.max(contextRefreshUntil, performance.now() + duration);
    if (!contextFrameId) contextFrameId = window.requestAnimationFrame(refreshContextLoop);
  }

  function handleScroll() {
    if (!enabled) return;
    refreshContextDuringMotion();
  }

  function enable() {
    if (enabled) return;
    enabled = true;
    root.classList.add('custom-cursor-ready');
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    window.addEventListener('mouseout', handlePointerLeave, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    dragging = false;
    setVisible(false);
    root.classList.remove('custom-cursor-ready');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
    window.removeEventListener('mouseout', handlePointerLeave);
    window.removeEventListener('scroll', handleScroll);
  }

  function applyInputMode() {
    if (finePointer.matches) enable();
    else disable();
  }

  const interactionObserver = new MutationObserver(() => refreshContextDuringMotion(500));
  interactionObserver.observe(sceneContainer, { attributes: true, attributeFilter: ['class'] });

  applyInputMode();
  finePointer.addEventListener('change', applyInputMode);

  return () => {
    disable();
    interactionObserver.disconnect();
    finePointer.removeEventListener('change', applyInputMode);
    window.cancelAnimationFrame(frameId);
    window.cancelAnimationFrame(contextFrameId);
  };
}
