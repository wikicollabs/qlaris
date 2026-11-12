import { nextTick, onBeforeUnmount, ref } from 'vue';
import {
  SKIP_EASE_IN,
  SKIP_EASE_OUT,
  STACK_STEP,
  TOAST_DISMISS_GRACE,
  TOAST_DURATION,
} from './CardViewConfig';
import { animationsEnabled } from '../UseAnimation';
import { animate, clone, getExitTransform, toRem } from './CardViewHelpers';
import { translate } from '../../locale';

export function useCardSkip({
  cardRef,
  contentRef,
  cardNumber,
  currentItem,
  currentCoverArt,
  phase,
  isInfoOpen,
  isPreview,
  submission,
  isLoaded,
  timers,
  showCover,
  clearCover,
  resetEdit,
  snapshotEditor,
  restoreEditor,
  onAdvance,
  onUndo,
}) {
  const toast = ref(null);

  let isAnimating = false;
  let lastSkipped = null;
  let toastSequence = 0;
  let toastTimer = null;
  const ghosts = new Set();

  const getStackLayers = () => [...(contentRef.value?.querySelectorAll(':scope > .card-view__stack') ?? [])];

  const createGhost = (modifier) => {
    const source = cardRef.value;
    const ghost = source.cloneNode(true);
    const sourceFields = source.querySelectorAll('input, textarea');

    ghost.classList.add('card-view__ghost', modifier);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    ghost.querySelectorAll('input, textarea').forEach((node, index) => {
      node.value = sourceFields[index].value;
    });
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    Object.assign(ghost.style, {
      top: toRem(source.offsetTop),
      left: toRem(source.offsetLeft),
      width: toRem(source.offsetWidth),
      height: toRem(source.offsetHeight),
    });

    contentRef.value.appendChild(ghost);
    ghosts.add(ghost);
    return ghost;
  };

  const settle = (animations, usedGhosts) =>
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      usedGhosts.forEach((ghost) => {
        ghost.remove();
        ghosts.delete(ghost);
      });
      isAnimating = false;
    });

  const canAnimate = () => Boolean(cardRef.value && contentRef.value) && isLoaded.value && animationsEnabled();

  const snapshotState = () =>
    clone({
      cardNumber: cardNumber.value,
      currentItem: currentItem.value,
      currentCoverArt: currentCoverArt.value,
      phase: phase.value,
      isInfoOpen: isInfoOpen.value,
      isPreview: isPreview.value,
      ...snapshotEditor(),
    });

  const restoreState = (snapshot) => {
    cardNumber.value = snapshot.cardNumber;
    currentItem.value = snapshot.currentItem;
    currentCoverArt.value = snapshot.currentCoverArt;
    isInfoOpen.value = snapshot.isInfoOpen;
    isPreview.value = snapshot.isPreview;
    submission.value = null;
    restoreEditor(snapshot);

    if (snapshot.phase === 'cover') {
      showCover();
    } else {
      clearCover();
      phase.value = snapshot.phase;
    }
  };

  const advance = ({ undoable }) => {
    if (isAnimating) return;

    const skippedNumber = cardNumber.value;
    const animated = canAnimate();
    let ghost = null;
    let leaving = null;

    if (animated) {
      ghost = createGhost('card-view__ghost--leaving');
      leaving = animate(ghost, [{ transform: 'none' }, { transform: getExitTransform(ghost) }], {
        easing: SKIP_EASE_IN,
        fill: 'forwards',
      });
    }

    lastSkipped = undoable ? snapshotState() : null;
    showToast(undoable ? translate('card-skipped', skippedNumber) : null);

    cardNumber.value += 1;
    isInfoOpen.value = false;
    submission.value = null;
    resetEdit();
    onAdvance?.(cardNumber.value);

    if (!animated) return;
    isAnimating = true;

    nextTick().then(() => {
      const [first, second] = getStackLayers();
      const forward = [{ transform: `translateY(${STACK_STEP})` }, { transform: 'none' }];
      const options = { easing: SKIP_EASE_OUT };

      settle(
        [
          leaving,
          animate(cardRef.value, forward, options),
          animate(first, forward, options),
          animate(
            second,
            [
              { transform: `translateY(${STACK_STEP})`, opacity: 0 },
              { transform: 'none', opacity: 1 },
            ],
            options
          ),
        ],
        [ghost]
      );
    });
  };

  const skip = () => advance({ undoable: true });

  const undo = () => {
    const snapshot = lastSkipped;
    if (!snapshot || isAnimating) return;

    lastSkipped = null;
    showToast(null);
    onUndo?.();

    const animated = canAnimate();
    const under = animated ? createGhost('card-view__ghost--under') : null;

    restoreState(snapshot);

    if (!animated) return;
    isAnimating = true;

    nextTick().then(() => {
      const card = cardRef.value;
      const [first, second, hidden] = getStackLayers();
      const backward = [{ transform: `translateY(-${STACK_STEP})` }, { transform: 'none' }];
      const options = { easing: SKIP_EASE_OUT };

      settle(
        [
          animate(card, [{ transform: getExitTransform(card) }, { transform: 'none' }], options),
          animate(
            under,
            [
              { transform: 'none', opacity: 1 },
              { transform: `translateY(${STACK_STEP})`, opacity: 0 },
            ],
            { ...options, fill: 'forwards' }
          ),
          animate(first, backward, options),
          animate(second, backward, options),
          animate(
            hidden,
            [
              { transform: `translateY(-${STACK_STEP})`, opacity: 1 },
              { transform: 'none', opacity: 0 },
            ],
            options
          ),
        ],
        [under]
      );
    });
  };

  const dismissToast = (id) => {
    if (toast.value?.id !== id) return;
    clearTimeout(toastTimer);
    toast.value = null;
    lastSkipped = null;
  };

  const showToast = (text) => {
    clearTimeout(toastTimer);
    if (!text) {
      toast.value = null;
      return;
    }
    const id = ++toastSequence;
    toast.value = { id, text };
    toastTimer = setTimeout(() => dismissToast(id), TOAST_DURATION + TOAST_DISMISS_GRACE);
    timers.push(toastTimer);
  };

  onBeforeUnmount(() => {
    ghosts.forEach((ghost) => ghost.remove());
  });

  return {
    toast,
    advance,
    skip,
    undo,
    dismissToast,
  };
}