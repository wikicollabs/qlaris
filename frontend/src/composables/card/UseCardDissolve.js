import { computed, nextTick, onBeforeUnmount, watch } from 'vue';
import {
  DISSOLVE_DURATION,
  DISSOLVE_EASE,
  SPLASH_DISSOLVE_DURATION,
  SPLASH_DISSOLVE_SPRING,
} from './CardViewConfig';
import { animateElement, animationsEnabled } from '../UseAnimation';
import { createCardGhost, springEasing } from './CardViewHelpers';

export function useCardDissolve({ cardRef, contentRef, phase, isPreview, submission, isBusy }) {
  const ghosts = new Set();

  const face = computed(() => submission.value ?? (isPreview.value ? 'preview' : phase.value));

  const getTransition = (from, to) =>
    from === 'cover' && to === 'form'
      ? {
          duration: SPLASH_DISSOLVE_DURATION,
          easing: springEasing(SPLASH_DISSOLVE_SPRING, SPLASH_DISSOLVE_DURATION),
        }
      : { duration: DISSOLVE_DURATION, easing: DISSOLVE_EASE };

  watch(
    face,
    async (to, from) => {
      const card = cardRef.value;
      const content = contentRef.value;

      if (!card || !content || !animationsEnabled() || isBusy()) return;

      const ghost = createCardGhost(card, content, 'card-view__ghost--dissolve');
      ghosts.add(ghost);

      await nextTick();

      const { duration, easing } = getTransition(from, to);
      const fade = animateElement(ghost, [{ opacity: 1 }, { opacity: 0 }], {
        duration,
        easing,
        fill: 'forwards',
      });

      Promise.allSettled([fade.finished]).then(() => {
        ghost.remove();
        ghosts.delete(ghost);
      });
    },
    { flush: 'pre' }
  );

  onBeforeUnmount(() => {
    ghosts.forEach((ghost) => ghost.remove());
    ghosts.clear();
  });
}