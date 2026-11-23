import { nextTick, onBeforeUnmount, watch } from 'vue';
import { FLIP_ANGLE, FLIP_DURATION, FLIP_EASE, FLIP_PERSPECTIVE } from './CardViewConfig';
import { animateElement, animationsEnabled } from '../UseAnimation';
import { createCardGhost } from './CardViewHelpers';

const getFlipFrames = (direction, fade) => {
  const quarter = FLIP_ANGLE / 2;
  const angles = [0, -direction * quarter, direction * quarter, 0];
  const offsets = [0, 0.5, 0.5, 1];

  return angles.map((angle, index) => ({
    offset: offsets[index],
    transform: `rotateY(${angle}deg)`,
    ...(fade ? { opacity: fade[index] } : {}),
  }));
};

export function useCardFlip({ cardRef, contentRef, phase, isPreview, submission, isBusy }) {
  const ghosts = new Set();
  let cleanup = null;

  const finish = () => {
    cleanup?.();
    cleanup = null;
  };

  watch(
    isPreview,
    async (preview) => {
      const card = cardRef.value;
      const content = contentRef.value;

      if (!card || !content || phase.value !== 'form' || submission.value || !animationsEnabled() || isBusy()) return;

      finish();

      const direction = preview ? 1 : -1;
      const ghost = createCardGhost(card, content, 'card-view__ghost--flip');
      const backdrop = createCardGhost(card, content, 'card-view__ghost--backdrop', { shallow: true });
      ghosts.add(ghost);
      ghosts.add(backdrop);

      ghost.style.zIndex = '5';
      content.style.perspective = `${FLIP_PERSPECTIVE}px`;

      await nextTick();

      const next = cardRef.value;
      const options = { duration: FLIP_DURATION, easing: FLIP_EASE, fill: 'both' };

      const running = next
        ? [
            animateElement(ghost, getFlipFrames(direction, [1, 0.6, 0, 0]), options),
            animateElement(next, getFlipFrames(direction, [0, 0, 0.4, 1]), options),
          ]
        : [];

      cleanup = () => {
        running.forEach((animation) => animation.cancel?.());
        content.style.perspective = '';
      };

      await Promise.allSettled(running.map((animation) => animation.finished));

      [ghost, backdrop].forEach((node) => {
        node.remove();
        ghosts.delete(node);
      });
      if (!ghosts.size) finish();
    },
    { flush: 'pre' }
  );

  onBeforeUnmount(() => {
    ghosts.forEach((ghost) => ghost.remove());
    ghosts.clear();
    finish();
  });
}