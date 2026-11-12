let enabled = true;

export const animationsEnabled = () => enabled;

export const setAnimationEnabled = (value) => {
  enabled = Boolean(value);
  document.documentElement.dataset.animation = enabled ? 'on' : 'off';
};

const noAnimation = { finished: Promise.resolve() };

export const animateElement = (element, keyframes, options) =>
  enabled ? element.animate(keyframes, options) : noAnimation;

export const runViewTransition = async (update, className) => {
  if (!enabled || !document.startViewTransition) {
    await update();
    return;
  }

  const root = document.documentElement;
  if (className) root.classList.add(className);

  try {
    await document.startViewTransition(update).finished;
  } finally {
    if (className) root.classList.remove(className);
  }
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

setAnimationEnabled(!reducedMotion.matches);
reducedMotion.addEventListener('change', (event) => setAnimationEnabled(!event.matches));