import { nextTick, onBeforeUnmount, ref } from 'vue';
import {
  DISSOLVE_DURATION,
  SKIP_BOUNCE_DURATION,
  SKIP_DRAG_DISTANCE,
  SKIP_DRAG_DURATION,
  SKIP_DRAG_RESISTANCE,
  SKIP_DRAG_RESISTANCE_RANGE,
  SKIP_DRAG_THRESHOLD,
  SKIP_DRAG_VELOCITY,
  SKIP_DURATION,
  SKIP_EASE,
  SKIP_ROTATION,
  STACK_STEP,
  TOAST_DISMISS_GRACE,
  TOAST_DURATION,
} from './CardViewConfig';
import { animationsEnabled } from '../UseAnimation';
import { animate, clone, createCardGhost, getExitTransform } from './CardViewHelpers';
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
    const ghost = createCardGhost(cardRef.value, contentRef.value, modifier);
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

  const discardGhost = (ghost) => {
    ghost?.remove();
    ghosts.delete(ghost);
  };

  const advance = ({ undoable, from = 'none', duration = SKIP_DURATION, rotation = SKIP_ROTATION, backdrop = null }) => {
    if (isAnimating) {
      discardGhost(backdrop);
      return;
    }

    const skippedNumber = cardNumber.value;
    const animated = canAnimate();
    let ghost = null;
    let leaving = null;

    if (animated) {
      ghost = createGhost('card-view__ghost--leaving');
      leaving = animate(ghost, [{ transform: from }, { transform: getExitTransform(ghost, rotation) }], {
        duration,
        easing: SKIP_EASE,
        fill: 'forwards',
      });
      leaving.finished
        .then(() => showToast(undoable ? translate('card-skipped', skippedNumber) : null))
        .catch(() => {});
    }

    lastSkipped = undoable ? { snapshot: snapshotState(), duration, rotation, skippedNumber } : null;

    const revealAt = performance.now() + (animated ? duration : 0);

    cardNumber.value += 1;
    isInfoOpen.value = false;
    submission.value = null;
    resetEdit();
    onAdvance?.(cardNumber.value, revealAt);

    if (!animated) {
      discardGhost(backdrop);
      showToast(undoable ? translate('card-skipped', skippedNumber) : null);
      return;
    }

    isAnimating = true;

    nextTick().then(() => {
      if (backdrop) {
        settle(
          [
            leaving,
            animate(cardRef.value, [{ opacity: 0 }, { opacity: 1 }], {
              duration: DISSOLVE_DURATION,
              delay: duration,
              easing: SKIP_EASE,
              fill: 'backwards',
            }),
          ],
          [ghost, backdrop]
        );
        return;
      }

      const [first, second] = getStackLayers();
      const forward = [{ transform: `translateY(${STACK_STEP})` }, { transform: 'none' }];
      const options = { duration, easing: SKIP_EASE };

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
    const skipped = lastSkipped;
    if (!skipped || isAnimating) return;

    lastSkipped = null;
    showToast(null);
    onUndo?.();

    const animated = canAnimate();
    const under = animated ? createGhost('card-view__ghost--under') : null;

    restoreState(skipped.snapshot);

    if (!animated) return;
    isAnimating = true;

    nextTick().then(() => {
      const card = cardRef.value;
      const [first, second, hidden] = getStackLayers();
      const backward = [{ transform: `translateY(-${STACK_STEP})` }, { transform: 'none' }];
      const options = { duration: skipped.duration, easing: SKIP_EASE };

      settle(
        [
          animate(
            card,
            [
              { transform: getExitTransform(card, skipped.rotation) },
              { transform: 'none' },
            ],
            options
          ),
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

  let drag = null;

  const blockNextClick = () => {
    const block = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };

    window.addEventListener('click', block, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', block, { capture: true }), 0);
  };

  const stopDragListening = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerCancel);

    if (drag?.active && drag.target.hasPointerCapture?.(drag.id)) {
      drag.target.releasePointerCapture(drag.id);
    }
  };

  const createBackdrop = () => {
    const source = cardRef.value;
    const backdrop = createCardGhost(source, contentRef.value, 'card-view__ghost--backdrop', { shallow: true });

    ghosts.add(backdrop);
    return backdrop;
  };

  const bounceBack = (from, backdrop) => {
    const card = cardRef.value;

    card.style.transform = '';
    isAnimating = true;

    animate(card, [{ transform: from }, { transform: 'none' }], {
      duration: SKIP_BOUNCE_DURATION,
      easing: SKIP_EASE,
    }).finished.then(() => {
      discardGhost(backdrop);
      isAnimating = false;
    });
  };

  const getDragOffset = (delta) =>
    delta < 0 ? delta : delta / (1 + (SKIP_DRAG_RESISTANCE * delta) / SKIP_DRAG_RESISTANCE_RANGE);

  const getDragAngle = (deltaX, width) =>
    Math.max(-SKIP_ROTATION, Math.min(SKIP_ROTATION, (deltaX / (width / 2)) * SKIP_ROTATION));

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id) return;

    const delta = event.clientY - drag.startY;

    if (!drag.active) {
      if (Math.abs(delta) < SKIP_DRAG_THRESHOLD) return;
      drag.active = true;
      drag.target.setPointerCapture?.(drag.id);
      if (canAnimate()) drag.backdrop = createBackdrop();
    }

    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;

    drag.offset = getDragOffset(delta);
    drag.angle = getDragAngle(event.clientX - drag.startX, drag.width);

    cardRef.value.style.transform = `translateY(${drag.offset}px) rotate(${drag.angle}deg)`;
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;

    const current = drag;
    stopDragListening();
    drag = null;

    if (!current.active) return;

    blockNextClick();

    const card = cardRef.value;
    const from = card.style.transform || 'none';
    const committed = -current.offset >= current.height * SKIP_DRAG_DISTANCE || current.velocity <= -SKIP_DRAG_VELOCITY;

    if (!committed) {
      bounceBack(from, current.backdrop);
      return;
    }

    card.style.transform = '';
    advance({
      undoable: true,
      from,
      duration: SKIP_DRAG_DURATION,
      rotation: current.angle,
      backdrop: current.backdrop,
    });
  }

  function onPointerCancel(event) {
    if (!drag || event.pointerId !== drag.id) return;

    const current = drag;
    const from = cardRef.value.style.transform || 'none';
    stopDragListening();
    drag = null;

    bounceBack(from, current.backdrop);
  }

  const onHeaderPointerDown = (event) => {
    if (drag || isAnimating || !isLoaded.value || isInfoOpen.value || !cardRef.value) return;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;

    drag = {
      id: event.pointerId,
      target: event.currentTarget,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      offset: 0,
      angle: 0,
      width: cardRef.value.offsetWidth,
      height: cardRef.value.offsetHeight,
      backdrop: null,
      active: false,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  };

  const isBusy = () => isAnimating || Boolean(drag?.active);

  onBeforeUnmount(() => {
    stopDragListening();
    ghosts.forEach((ghost) => ghost.remove());
  });

  return {
    toast,
    advance,
    skip,
    undo,
    dismissToast,
    onHeaderPointerDown,
    isBusy,
  };
}