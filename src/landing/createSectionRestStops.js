import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const TRANSITIONS = ['dyson-hero', 'create-style-transition', 'feel-air-transition'];
const ADJUSTMENT_DURATION = 0.15;

export function createSectionRestStops({ page, sceneContainer, isDragging }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let previousY = window.scrollY;
  let direction = 0;
  let adjustment;

  function finishAdjustment() {
    adjustment = undefined;
    window.removeEventListener('wheel', cancelAdjustment);
    window.removeEventListener('pointerdown', cancelAdjustment);
    window.removeEventListener('keydown', cancelAdjustment);
  }

  function cancelAdjustment() {
    adjustment?.kill();
    finishAdjustment();
  }

  function reset() {
    cancelAdjustment();
    previousY = window.scrollY;
    direction = 0;
  }

  function handleScroll() {
    const currentY = window.scrollY;
    if (currentY === previousY) return;
    cancelAdjustment();
    direction = Math.sign(currentY - previousY);
    previousY = currentY;
  }

  function canAdjust() {
    return !reducedMotion.matches && !page.inert && !isDragging();
  }

  function settleAtRestStop() {
    if (!direction || adjustment || !canAdjust()) return;
    const currentY = window.scrollY;
    const radius = window.innerWidth < 768 ? 18 : 24;
    let target;
    let nearestDistance = radius;

    for (const id of TRANSITIONS) {
      const trigger = ScrollTrigger.getById(id);
      if (!trigger) continue;
      const end = Math.round(trigger.end);
      const distance = (end - currentY) * direction;
      if (distance > 1 && distance <= nearestDistance) {
        target = end;
        nearestDistance = distance;
      }
    }

    direction = 0;
    if (target === undefined) return;
    const position = { y: currentY };
    adjustment = gsap.to(position, {
      y: target,
      duration: ADJUSTMENT_DURATION,
      ease: 'power2.out',
      onUpdate: () => {
        if (window.scrollY !== previousY || !canAdjust()) {
          cancelAdjustment();
          return;
        }
        // Keep the document's smooth navigation setting out of this short tween.
        window.scrollTo({ top: position.y, behavior: 'instant' });
        previousY = window.scrollY;
      },
      onComplete: finishAdjustment,
    });
    // These passive listeners only cancel an active adjustment.
    window.addEventListener('wheel', cancelAdjustment, { passive: true });
    window.addEventListener('pointerdown', cancelAdjustment, { passive: true });
    window.addEventListener('keydown', cancelAdjustment);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  sceneContainer.addEventListener('pointerdown', reset, { passive: true });
  reducedMotion.addEventListener('change', reset);
  ScrollTrigger.addEventListener('refreshInit', reset);
  ScrollTrigger.addEventListener('scrollEnd', settleAtRestStop);

  return () => {
    reset();
    window.removeEventListener('scroll', handleScroll);
    sceneContainer.removeEventListener('pointerdown', reset);
    reducedMotion.removeEventListener('change', reset);
    ScrollTrigger.removeEventListener('refreshInit', reset);
    ScrollTrigger.removeEventListener('scrollEnd', settleAtRestStop);
  };
}
