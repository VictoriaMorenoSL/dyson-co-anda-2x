const PIXELS_PER_SECOND = 44;

export function createEditorialCarousel({ section }) {
  if (!section) return () => {};

  const viewport = section.querySelector('.editorial-carousel__viewport');
  const track = section.querySelector('.editorial-carousel__track');
  const sequence = section.querySelector('.editorial-carousel__sequence');
  const duplicate = sequence.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.querySelectorAll('img').forEach((image) => {
    image.alt = '';
  });
  track.append(duplicate);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0;
  let offset = 0;
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let gesture = null;

  function render() {
    if (!width) return;
    offset = ((offset % width) + width) % width;
    track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  }

  function animate(time) {
    frame = 0;
    if (!visible || reducedMotion.matches || gesture) return;
    if (lastTime) offset += PIXELS_PER_SECOND * Math.min(time - lastTime, 50) / 1000;
    lastTime = time;
    render();
    frame = requestAnimationFrame(animate);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (visible && !reducedMotion.matches && !gesture) frame = requestAnimationFrame(animate);
  }

  function updateWidth() {
    const nextWidth = sequence.getBoundingClientRect().width;
    if (width && nextWidth) offset *= nextWidth / width;
    width = nextWidth;
    render();
  }

  function startDrag(event) {
    if (gesture || !event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, offset, dragging: false };
    syncAnimation();
  }

  function moveDrag(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        finishDrag(event);
        return;
      }
      gesture.dragging = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
    }
    offset = gesture.offset - dx;
    render();
  }

  function finishDrag(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    gesture = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    viewport.classList.remove('is-dragging');
    syncAnimation();
  }

  const resizeObserver = new ResizeObserver(updateWidth);
  resizeObserver.observe(sequence);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncAnimation();
  }, { threshold: 0.04 });
  visibilityObserver.observe(section);

  viewport.addEventListener('pointerdown', startDrag);
  viewport.addEventListener('pointermove', moveDrag);
  viewport.addEventListener('pointercancel', finishDrag);
  window.addEventListener('pointerup', finishDrag);
  reducedMotion.addEventListener('change', syncAnimation);
  updateWidth();

  return () => {
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    duplicate.remove();
    cancelAnimationFrame(frame);
    viewport.removeEventListener('pointerdown', startDrag);
    viewport.removeEventListener('pointermove', moveDrag);
    viewport.removeEventListener('pointercancel', finishDrag);
    window.removeEventListener('pointerup', finishDrag);
    reducedMotion.removeEventListener('change', syncAnimation);
    track.style.removeProperty('transform');
  };
}
