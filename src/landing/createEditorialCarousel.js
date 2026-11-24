const PIXELS_PER_SECOND = 44;

export function createEditorialCarousel({ section }) {
  if (!section) return () => {};

  const track = section.querySelector('.editorial-carousel__track');
  const sequence = section.querySelector('.editorial-carousel__sequence');
  const duplicate = sequence.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.querySelectorAll('img').forEach((image) => {
    image.alt = '';
  });
  track.append(duplicate);

  function updateDuration() {
    const duration = Math.max(sequence.scrollWidth / PIXELS_PER_SECOND, 24);
    track.style.setProperty('--carousel-duration', `${duration}s`);
  }

  const resizeObserver = new ResizeObserver(updateDuration);
  resizeObserver.observe(sequence);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    section.classList.toggle('is-running', entry.isIntersecting);
  }, { threshold: 0.04 });
  visibilityObserver.observe(section);

  updateDuration();

  return () => {
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    duplicate.remove();
    section.classList.remove('is-running');
  };
}
