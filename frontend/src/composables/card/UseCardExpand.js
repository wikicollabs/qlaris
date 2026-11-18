import { nextTick, onBeforeUnmount } from 'vue';
import { EXPAND_DURATION, EXPAND_EASE, EXPAND_TOP_CATCHUP } from './CardViewConfig';
import { animateElement, animationsEnabled } from '../UseAnimation';
import { fieldId } from './CardViewHelpers';
import { buildClipFrames } from './CardExpandFrames';

const getFrames = (mode, sectionRect, editorRect) =>
  buildClipFrames({
    sectionRect,
    editorRect,
    mode,
    easing: EXPAND_EASE,
    topCatchup: EXPAND_TOP_CATCHUP,
  });

export function useCardExpand({ cardRef }) {
  const operations = new Map();

  const getSection = (property) =>
    document.getElementById(fieldId(property))?.closest('.card-view__field') ?? null;

  const prepareGhost = (source, ghost) => {
    const sourceFields = source.querySelectorAll('input, textarea');

    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    ghost.querySelectorAll('input, textarea').forEach((node, index) => {
      node.value = sourceFields[index]?.value ?? node.value;
    });
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
  };

  const placeGhost = (source, ghost) => {
    const card = cardRef.value;
    if (!card) return false;

    const cardRect = card.getBoundingClientRect();
    const rect = source.getBoundingClientRect();

    Object.assign(ghost.style, {
      position: 'absolute',
      top: `${rect.top - cardRect.top - card.clientTop}px`,
      left: `${rect.left - cardRect.left - card.clientLeft}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      flex: 'none',
      zIndex: '6',
      transition: 'none',
      pointerEvents: 'none',
    });

    card.appendChild(ghost);
    return true;
  };

  const afterRender = async () => {
    await nextTick();
    await nextTick();
  };

  const discardGhost = (ghost) => ghost?.remove();

  const stopOperation = (property) => {
    const operation = operations.get(property);
    if (!operation) return;

    operation.animations.forEach((animation) => animation.cancel?.());
    if (operation.container) {
      operation.container.style.overflow = operation.previousOverflow;
    }
    discardGhost(operation.ghost);
    operations.delete(property);
  };

  const createOperation = (property, ghost) => {
    stopOperation(property);
    const operation = {
      ghost,
      animations: [],
      container: null,
      previousOverflow: '',
    };
    operations.set(property, operation);
    return operation;
  };

  const cleanupOperation = (property, operation) => {
    if (operations.get(property) !== operation) return;

    if (operation.container) {
      operation.container.style.overflow = operation.previousOverflow;
    }
    discardGhost(operation.ghost);
    operations.delete(property);
  };

  const expand = async (property) => {
    if (!animationsEnabled()) return;

    const body = cardRef.value?.querySelector('.card-view__body');
    const section = getSection(property);
    if (!body || !section) return;

    const sectionRect = section.getBoundingClientRect();
    const ghost = body.cloneNode(true);
    prepareGhost(body, ghost);

    const form = body.querySelector('.card-view__form');
    const ghostForm = ghost.querySelector('.card-view__form');
    if (form && ghostForm) ghostForm.scrollTop = form.scrollTop;

    if (!placeGhost(body, ghost)) return;

    const operation = createOperation(property, ghost);

    try {
      await afterRender();
      if (operations.get(property) !== operation) return;

      const editor = cardRef.value?.querySelector('.card-view__body .card-view__editor');
      const container = editor?.parentElement;
      if (!editor || !container) return;

      operation.container = container;
      operation.previousOverflow = container.style.overflow;
      container.style.overflow = 'hidden';

      const frames = getFrames('expand', sectionRect, editor.getBoundingClientRect());
      const fields = [...editor.querySelectorAll('.card-view__field')];
      const fieldAnimations = fields.map((field, index) =>
        animateElement(field, [{ opacity: 0 }, { opacity: 1 }], {
          duration: EXPAND_DURATION,
          delay: index * 25,
          easing: EXPAND_EASE,
          fill: 'both',
        }),
      );
      operation.animations = [
        animateElement(
          editor,
          frames.map(({ clipPath }) => ({ clipPath })),
          {
            duration: EXPAND_DURATION,
            easing: 'linear',
            fill: 'backwards',
          },
        ),
        animateElement(ghost, [{ opacity: 1 }, { opacity: 0 }], {
          duration: EXPAND_DURATION,
          easing: EXPAND_EASE,
          fill: 'forwards',
        }),
        ...fieldAnimations,
      ];

      await Promise.allSettled(operation.animations.map((animation) => animation.finished));
    } finally {
      cleanupOperation(property, operation);
    }
  };

  const collapse = async (property) => {
    if (!animationsEnabled()) return;

    const editor = cardRef.value?.querySelector('.card-view__body .card-view__editor');
    if (!editor) return;

    const editorRect = editor.getBoundingClientRect();
    const ghost = editor.cloneNode(true);
    prepareGhost(editor, ghost);

    if (!placeGhost(editor, ghost)) return;

    const operation = createOperation(property, ghost);

    try {
      await afterRender();
      if (operations.get(property) !== operation) return;

      const section = getSection(property);
      if (!section) return;

      const frames = getFrames('collapse', section.getBoundingClientRect(), editorRect);
      operation.animations = [
        animateElement(ghost, frames, {
          duration: EXPAND_DURATION,
          easing: 'linear',
          fill: 'forwards',
        }),
      ];

      await Promise.allSettled(operation.animations.map((animation) => animation.finished));
    } finally {
      cleanupOperation(property, operation);
    }
  };

  onBeforeUnmount(() => {
    [...operations.keys()].forEach(stopOperation);
  });

  return { expand, collapse };
}