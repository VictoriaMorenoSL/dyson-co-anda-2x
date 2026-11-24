import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function createFooterMotion({ footer }) {
  if (!footer) return () => {};

  const revealGroups = [...footer.querySelectorAll('[data-footer-reveal]')];
  const backTop = footer.querySelector('[data-back-top]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let entranceTimeline;

  const buildEntrance = () => {
    entranceTimeline?.scrollTrigger?.kill();
    entranceTimeline?.kill();

    if (reducedMotion.matches) {
      gsap.set(revealGroups, { clearProps: 'all' });
      return;
    }

    entranceTimeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        id: 'site-footer-entrance',
        trigger: footer,
        start: 'top 92%',
        end: 'top 48%',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
    });

    entranceTimeline.fromTo(
      revealGroups,
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 },
    );
  };

  const handleBackTop = (event) => {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  };

  const handleMotionPreference = () => {
    buildEntrance();
    ScrollTrigger.refresh();
  };

  backTop?.addEventListener('click', handleBackTop);
  reducedMotion.addEventListener('change', handleMotionPreference);
  buildEntrance();

  return () => {
    backTop?.removeEventListener('click', handleBackTop);
    reducedMotion.removeEventListener('change', handleMotionPreference);
    entranceTimeline?.scrollTrigger?.kill();
    entranceTimeline?.kill();
  };
}
