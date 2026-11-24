import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function createMeetProduct({ section }) {
  if (!section) return () => {};

  const gallery = section.querySelector('.meet-gallery');
  const track = gallery.querySelector('.meet-gallery__track');
  const originalSlides = [...track.querySelectorAll('.meet-gallery__slide')];
  const createLoopClone = (slide) => {
    const clone = slide.cloneNode(true);
    clone.classList.remove('is-active');
    clone.removeAttribute('aria-current');
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    clone.dataset.loopClone = 'true';
    return clone;
  };
  const leadingClones = originalSlides.map(createLoopClone);
  const trailingClones = originalSlides.map(createLoopClone);
  track.prepend(...leadingClones);
  track.append(...trailingClones);
  const slides = [...track.querySelectorAll('.meet-gallery__slide')];
  const title = section.querySelector('.meet-product__title');
  const titleWords = [...title.querySelectorAll('.meet-product__word')];
  const titleLetters = [...title.querySelectorAll('.meet-product__letter')];
  const details = section.querySelector('.meet-product__details');
  const detailItems = [...details.children];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let dragStartX = 0;
  let dragStartScroll = 0;
  let pointerId = null;
  let didDrag = false;
  let suppressClick = false;
  let scrollFrame = 0;
  let loopTimer = 0;
  let introTimeline;
  let resizeTimer;

  function normalizeIndex(index) {
    return (index + originalSlides.length) % originalSlides.length;
  }

  function updateActive(index, centeredSlide = null) {
    activeIndex = normalizeIndex(index);
    const visualSlide = centeredSlide || originalSlides[activeIndex];
    slides.forEach((slide) => {
      const active = slide === visualSlide;
      slide.classList.toggle('is-active', active);
      if (!slide.dataset.loopClone && Number(slide.dataset.galleryIndex) === activeIndex) {
        slide.setAttribute('aria-current', 'true');
      }
      else slide.removeAttribute('aria-current');
    });
  }

  function getCenteredScroll(slide) {
    return slide.offsetLeft - (gallery.clientWidth - slide.offsetWidth) / 2;
  }

  function centerPhysicalSlide(physicalIndex, behavior = reducedMotion.matches ? 'auto' : 'smooth') {
    const boundedIndex = Math.max(0, Math.min(slides.length - 1, physicalIndex));
    const slide = slides[boundedIndex];
    updateActive(Number(slide.dataset.galleryIndex), slide);
    gallery.scrollTo({ left: getCenteredScroll(slide), behavior });
  }

  function getClosestPhysicalIndex() {
    const galleryCenter = gallery.scrollLeft + gallery.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - galleryCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }

  function centerSlide(index, behavior = reducedMotion.matches ? 'auto' : 'smooth') {
    const logicalIndex = normalizeIndex(index);
    const galleryCenter = gallery.scrollLeft + gallery.clientWidth / 2;
    let closestPhysicalIndex = originalSlides.length + logicalIndex;
    let closestDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, physicalIndex) => {
      if (Number(slide.dataset.galleryIndex) !== logicalIndex) return;
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(slideCenter - galleryCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPhysicalIndex = physicalIndex;
      }
    });

    centerPhysicalSlide(closestPhysicalIndex, behavior);
  }

  function normalizeLoopPosition() {
    const physicalIndex = getClosestPhysicalIndex();
    const count = originalSlides.length;
    let targetIndex = physicalIndex;
    if (physicalIndex < count) targetIndex = physicalIndex + count;
    if (physicalIndex >= count * 2) targetIndex = physicalIndex - count;
    if (targetIndex !== physicalIndex) centerPhysicalSlide(targetIndex, 'auto');
  }

  function handleScroll() {
    window.cancelAnimationFrame(scrollFrame);
    window.clearTimeout(loopTimer);
    scrollFrame = window.requestAnimationFrame(() => {
      const physicalIndex = getClosestPhysicalIndex();
      const slide = slides[physicalIndex];
      updateActive(Number(slide.dataset.galleryIndex), slide);
    });
    loopTimer = window.setTimeout(normalizeLoopPosition, 140);
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = gallery.scrollLeft;
    didDrag = false;
    gallery.classList.add('is-dragging');
    gallery.setPointerCapture(pointerId);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== pointerId) return;
    const distance = event.clientX - dragStartX;
    if (Math.abs(distance) > 5) didDrag = true;
    if (didDrag) event.preventDefault();
    gallery.scrollLeft = dragStartScroll - distance;
  }

  function finishDrag(event) {
    if (event.pointerId !== pointerId) return;
    if (gallery.hasPointerCapture(pointerId)) gallery.releasePointerCapture(pointerId);
    pointerId = null;
    gallery.classList.remove('is-dragging');
    if (didDrag) {
      suppressClick = true;
      centerPhysicalSlide(getClosestPhysicalIndex());
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
  }

  function handleKeydown(event) {
    const slide = event.currentTarget;
    const index = Number(slide.dataset.galleryIndex);
    let nextIndex = index;

    if (event.key === 'ArrowLeft') nextIndex = normalizeIndex(index - 1);
    if (event.key === 'ArrowRight') nextIndex = normalizeIndex(index + 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = originalSlides.length - 1;
    if (nextIndex === index) return;

    event.preventDefault();
    centerSlide(nextIndex);
    originalSlides[nextIndex].focus({ preventScroll: true });
  }

  function buildEntrance() {
    introTimeline?.scrollTrigger?.kill();
    introTimeline?.kill();

    if (reducedMotion.matches) {
      gsap.set([title, titleWords, titleLetters, slides, detailItems], { clearProps: 'all' });
      return;
    }

    gsap.set(title, { autoAlpha: 1 });
    gsap.set(titleLetters, { x: 0, autoAlpha: 1 });
    const safeInset = Math.max(36, window.innerWidth * 0.045);
    const availableWidth = Math.max(window.innerWidth - safeInset * 2, 1);
    const initialLetterOffsets = titleLetters.map((letter, index) => {
      const rect = letter.getBoundingClientRect();
      const progress = titleLetters.length > 1 ? index / (titleLetters.length - 1) : 0.5;
      const targetCenter = safeInset + availableWidth * progress;
      return targetCenter - (rect.left + rect.width / 2);
    });

    introTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'meet-product-entrance',
        trigger: section,
        start: 'top 88%',
        end: 'top 16%',
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
    });

    introTimeline
      .fromTo(
        titleLetters,
        { x: (index) => initialLetterOffsets[index], autoAlpha: 1 },
        { x: 0, autoAlpha: 1, duration: 0.72 },
        0,
      )
      .fromTo(
        slides,
        { autoAlpha: 0, y: 38 },
        { autoAlpha: 1, y: 0, duration: 0.44, stagger: 0.035 },
        0.34,
      )
      .fromTo(
        detailItems,
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.34, stagger: 0.04 },
        0.62,
      );
  }

  const slideHandlers = slides.map((slide, index) => {
    const click = (event) => {
      if (suppressClick) {
        event.preventDefault();
        return;
      }
      centerSlide(index);
    };
    slide.addEventListener('click', click);
    slide.addEventListener('keydown', handleKeydown);
    return { slide, click };
  });

  gallery.addEventListener('scroll', handleScroll, { passive: true });
  gallery.addEventListener('pointerdown', handlePointerDown);
  gallery.addEventListener('pointermove', handlePointerMove);
  gallery.addEventListener('pointerup', finishDrag);
  gallery.addEventListener('pointercancel', finishDrag);

  const handleResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => centerSlide(activeIndex, 'auto'), 120);
  };
  const handleMotionPreference = () => {
    buildEntrance();
    ScrollTrigger.refresh();
  };

  window.addEventListener('resize', handleResize);
  reducedMotion.addEventListener('change', handleMotionPreference);
  buildEntrance();
  window.requestAnimationFrame(() => centerPhysicalSlide(originalSlides.length, 'auto'));

  return () => {
    window.clearTimeout(resizeTimer);
    window.clearTimeout(loopTimer);
    window.cancelAnimationFrame(scrollFrame);
    window.removeEventListener('resize', handleResize);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    gallery.removeEventListener('scroll', handleScroll);
    gallery.removeEventListener('pointerdown', handlePointerDown);
    gallery.removeEventListener('pointermove', handlePointerMove);
    gallery.removeEventListener('pointerup', finishDrag);
    gallery.removeEventListener('pointercancel', finishDrag);
    slideHandlers.forEach(({ slide, click }) => {
      slide.removeEventListener('click', click);
      slide.removeEventListener('keydown', handleKeydown);
    });
    introTimeline?.scrollTrigger?.kill();
    introTimeline?.kill();
    [...leadingClones, ...trailingClones].forEach((clone) => clone.remove());
  };
}
