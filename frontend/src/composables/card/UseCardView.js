import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { cdxIconError, cdxIconInfo } from '@wikimedia/codex-icons';
import { findCategory } from '../../data/categories';
import { isRtl, translate } from '../../locale';
import {
  CARDS,
  COVER_ART_TIMEOUT,
  COVER_DURATION,
  DEFAULT_CARD,
  LOADING_DURATION,
  MAX_YEAR,
  MIN_YEAR,
  NEXT_BUTTON_ID,
  PICKER_BUTTON_ID,
  PICKER_INPUT_ID,
  REQUEST_TIMEOUT,
  STACK_DURATION,
  STACK_EASE,
  STACK_STEP,
  SUBMIT_DURATION,
  SUBMIT_EXIT_DELAY,
  SUBMIT_EXIT_DURATION,
  SUBMIT_EXIT_EASE,
  SUBMIT_ROTATION,
  TOAST_DURATION,
  YEAR_INPUT_ID,
  dateField,
  fields,
  months,
  titleField,
} from './CardViewConfig';
import {
  animate,
  fieldId,
  focusById,
  formatEntity,
  settleAfter,
  splitEntityLabel,
} from './CardViewHelpers';
import { titleLanguages } from '../../services/titleLanguages';
import { useCardChanges } from './UseCardChanges';
import { useCardDissolve } from './UseCardDissolve';
import { useCardEditor } from './UseCardEditor';
import { useCardExpand } from './UseCardExpand';
import { useCardFlip } from './UseCardFlip';
import { useCardSkip } from './UseCardSkip';

export function useCardView(props, emit) {
  const category = computed(() => findCategory(props.category));

  const cardNumber = ref(1);
  const discoveredItems = ref([]);
  const currentItem = ref(null);
  const currentCoverArt = ref(null);
  const API_URL = import.meta.env.VITE_API_URL ?? '/api';
  const phase = ref('loading');
  const isInfoOpen = ref(false);
  const triggerRef = ref(null);
  const cardRef = ref(null);
  const contentRef = ref(null);
  const collapseRef = ref(null);
  const isPreview = ref(false);
  const submission = ref(null);

  const timers = [];
  const controller = new AbortController();
  let navigationController = null;
  const prefetchedItems = new Map();
  const prefetchControllers = new Map();
  const prefetchQueue = [];
  const queuedPrefetches = new Set();
  let activePrefetches = 0;
  let isUnmounted = false;
  let coverTimer = null;
  let loadController = null;
  let failedStep = 'load';

  const card = computed(() =>
    currentItem.value
      ? {
          ...currentItem.value,
          cover: currentCoverArt.value?.url ?? DEFAULT_CARD.cover,
          coverSource: currentCoverArt.value?.url ? 'Cover Art Archive' : null,
        }
      : DEFAULT_CARD
  );
  const isLoaded = computed(() => phase.value === 'cover' || phase.value === 'form');
  const isForm = computed(() => phase.value === 'form');
  const isSubmitting = computed(() => submission.value !== null);

  const title = computed(() => formatEntity(card.value));

  const titleParts = computed(() => splitEntityLabel(title.value));

  const description = computed(() => card.value.description ?? translate('card-no-description'));

  const subtitleParts = computed(() =>
    [
      { key: 'type', entity: card.value.instanceOf, fallback: 'card-unknown-type' },
      { key: 'performer', entity: card.value.performer, fallback: 'card-unknown-performer' },
    ].map(({ key, entity, fallback }) => ({
      key,
      text: entity ? entity.label : translate(fallback),
      empty: !entity,
    }))
  );

  const entityDetail = (property, entity) => ({
    property,
    value: entity ? formatEntity(entity) : translate('card-detail-no-value'),
    empty: !entity,
  });

  const details = computed(() => {
    const { aliases, instanceOf, performer, description: text } = card.value;

    return [
      ...(aliases.length ? [{ property: 'also known as', value: aliases.join(', '), bold: true, stacked: true }] : []),
      entityDetail('instance of', instanceOf),
      entityDetail('performer', performer),
      {
        property: 'description',
        value: text ?? translate('card-detail-no-description'),
        paragraph: true,
        empty: !text,
      },
    ];
  });

  const goHome = () => emit('home');

  const statuses = {
    error: {
      icon: cdxIconError,
      role: 'alert',
      heading: translate('card-load-error-heading'),
      message: translate('card-load-error-message'),
      actionLabel: translate('card-load-error-action'),
      onAction: () => retryLoad(),
    },
    empty: {
      icon: cdxIconInfo,
      role: 'status',
      heading: translate('card-load-empty-heading'),
      actionLabel: translate('card-load-empty-action'),
      onAction: goHome,
    },
  };

  const status = computed(() => statuses[phase.value]);

  const toggleInfo = async (event) => {
    isInfoOpen.value = !isInfoOpen.value;
    if (event?.detail !== 0) return;
    await nextTick();
    const target = isInfoOpen.value ? collapseRef.value?.$el : triggerRef.value;
    target?.focus();
  };

  const openPreview = () => {
    isPreview.value = true;
  };

  const closePreview = () => {
    isPreview.value = false;
    focusById(NEXT_BUTTON_ID);
  };

  const showCover = (revealAt = 0) => {
    clearTimeout(coverTimer);
    phase.value = 'cover';
    const wait = Math.max(0, revealAt - performance.now());
    coverTimer = setTimeout(() => {
      phase.value = 'form';
    }, wait + COVER_DURATION);
    timers.push(coverTimer);
  };

  const clearCover = () => clearTimeout(coverTimer);

  const introduceStack = async () => {
    await nextTick();

    const layers = [...(contentRef.value?.querySelectorAll(':scope > .card-view__stack') ?? [])].slice(0, 2);

    layers.forEach((layer, index) => {
      animate(
        layer,
        [
          { transform: `translateY(calc(${STACK_STEP} * -${index + 1}))`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: STACK_DURATION, easing: STACK_EASE }
      );
    });
  };

  const { expand, collapse } = useCardExpand({ cardRef });

  const {
    resetEdit,
    snapshotEditor,
    restoreEditor,
    initialValues,
    ...editor
  } = useCardEditor({ card, cardNumber, isPreview, timers, expand, collapse });

  const changes = useCardChanges({
    savedTitle: editor.savedTitle,
    savedDate: editor.savedDate,
    savedLists: editor.savedLists,
    initialValues,
  });

  const { advance, isBusy, ...skipApi } = useCardSkip({
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
    onAdvance: (number, revealAt, holdCoverUntil) => loadDiscoveredItem(number, revealAt, holdCoverUntil),
    onUndo: () => {
      navigationController?.abort();
      clearCover();
    },
  });

  useCardDissolve({ cardRef, contentRef, phase, isPreview, submission, isBusy });

  useCardFlip({ cardRef, contentRef, phase, isPreview, submission, isBusy });

  const preloadCoverImage = (url, signal) =>
    new Promise((resolve, reject) => {
      if (!url) {
        resolve();
        return;
      }

      const image = new Image();

      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        signal.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        cleanup();
        image.src = '';
        reject(signal.reason);
      };

      if (signal.aborted) {
        reject(signal.reason);
        return;
      }

      image.onload = () => {
        cleanup();
        resolve();
      };

      image.onerror = () => {
        cleanup();
        reject(new Error('Unable to preload cover image'));
      };

      signal.addEventListener('abort', onAbort, { once: true });
      image.src = url;
    });

  const prepareCoverArt = async (id, signal) => {
    const artworkSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(COVER_ART_TIMEOUT),
    ]);

    try {
      const coverArt = await fetchCoverArt(id, artworkSignal);

      if (coverArt?.url) {
        await preloadCoverImage(coverArt.url, artworkSignal);
      }

      return coverArt;
    } catch (error) {
      if (!signal.aborted) {
        console.warn('[Qlaris] Unable to prepare cover art:', error);
      }

      return null;
    }
  };

  const prefetchDiscoveredItem = (number) => {
    const id = discoveredItems.value[number - 1];

    if (!id || isUnmounted) return;
    if (prefetchedItems.has(id)) return prefetchedItems.get(id);

    const prefetchController = new AbortController();
    const signal = prefetchController.signal;

    prefetchControllers.set(id, prefetchController);

    const promise = Promise.all([
      fetchItem(id, signal),
      prepareCoverArt(id, signal),
    ])
      .then(([item, coverArt]) => ({ item, coverArt }))
      .catch((error) => {
        if (!signal.aborted) {
          console.error('[Qlaris] Unable to prefetch item:', error);
        }

        prefetchedItems.delete(id);
        return null;
      })
      .finally(() => {
        prefetchControllers.delete(id);
      });

    prefetchedItems.set(id, promise);
    return promise;
  };

  const processPrefetchQueue = () => {
    if (isUnmounted) return;

    while (activePrefetches < 2 && prefetchQueue.length > 0) {
      const number = prefetchQueue.shift();
      queuedPrefetches.delete(number);

      activePrefetches += 1;

      Promise.resolve(prefetchDiscoveredItem(number)).finally(() => {
        activePrefetches -= 1;
        processPrefetchQueue();
      });
    }
  };

  const prefetchUpcomingItems = (number) => {
    if (isUnmounted) return;

    const lastCard = Math.min(number + 3, discoveredItems.value.length);

    for (let next = number + 1; next <= lastCard; next += 1) {
      const id = discoveredItems.value[next - 1];

      if (!id || prefetchedItems.has(id) || queuedPrefetches.has(next)) {
        continue;
      }

      prefetchQueue.push(next);
      queuedPrefetches.add(next);
    }

    processPrefetchQueue();
  };

  const retryLoad = () => {
    if (failedStep === 'navigate') {
      loadDiscoveredItem(cardNumber.value);
      return;
    }

    loadCard();
  };

  const loadDiscoveredItem = async (number, revealAt = 0, holdCoverUntil = 0) => {
    clearCover();
    navigationController?.abort();

    const id = discoveredItems.value[number - 1];

    if (!id) {
      currentItem.value = null;
      currentCoverArt.value = null;
      phase.value = 'empty';
      return;
    }

    navigationController = new AbortController();
    const signal = navigationController.signal;

    phase.value = 'loading';
    currentItem.value = null;
    currentCoverArt.value = null;

    try {
      const prefetched = await prefetchedItems.get(id);

      if (signal.aborted || isUnmounted) return;

      const item = prefetched?.item ?? await fetchItem(id, signal);

      if (signal.aborted || isUnmounted) return;

      const coverArt = prefetched
        ? prefetched.coverArt
        : await prepareCoverArt(id, signal);

      if (signal.aborted || isUnmounted) return;

      const hold = holdCoverUntil - performance.now();

      if (hold > 0) {
        await new Promise((resolve) => {
          const holdTimer = setTimeout(resolve, hold);
          timers.push(holdTimer);
          signal.addEventListener('abort', resolve, { once: true });
        });

        if (signal.aborted || isUnmounted) return;
      }

      currentItem.value = item;
      currentCoverArt.value = coverArt;
      resetEdit();

      showCover(revealAt);
      prefetchUpcomingItems(number);
    } catch (error) {
      if (signal.aborted || isUnmounted) return;

      console.error('[Qlaris] Unable to load item:', error);
      failedStep = 'navigate';
      phase.value = 'error';
    }
  };

  const fetchDiscovery = async (signal) => {
    const response = await fetch(
      `${API_URL}/items/discover?region=${encodeURIComponent(props.region)}`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`Discovery failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.items)) {
      throw new Error('Invalid discovery response');
    }

    return data.items;
  };

  const fetchItem = async (id, signal) => {
    const response = await fetch(
      `${API_URL}/items/${encodeURIComponent(id)}`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`Item retrieval failed with status ${response.status}`);
    }

    const item = await response.json();

    if (item.id !== id) {
      throw new Error('Invalid Item response');
    }

    return item;
  };

  const fetchCoverArt = async (id, signal) => {
    const response = await fetch(
      `${API_URL}/items/${encodeURIComponent(id)}/cover-art`,
      { signal }
    );

    if (!response.ok) {
      throw new Error(`Cover art retrieval failed with status ${response.status}`);
    }

    return response.json();
  };

  const fetchCard = (signal) => settleAfter(signal, LOADING_DURATION, (resolve) => resolve(card.value));

  const submitContribution = (signal) =>
    settleAfter(signal, SUBMIT_DURATION, (resolve, reject) =>
      navigator.onLine ? resolve() : reject(new Error('Network is offline'))
    );

  const submit = async () => {
    submission.value = 'submitting';

    try {
      await submitContribution(controller.signal);
      submission.value = 'success';
      timers.push(
        setTimeout(
          () =>
            advance({
              undoable: false,
              axis: 'horizontal',
              duration: SUBMIT_EXIT_DURATION,
              easing: SUBMIT_EXIT_EASE,
              rotation: isRtl.value ? -SUBMIT_ROTATION : SUBMIT_ROTATION,
            }),
          SUBMIT_EXIT_DELAY
        )
      );
    } catch (err) {
      if (isUnmounted) return;
      console.error('[Qlaris] Unable to submit contribution:', err);
      submission.value = 'failed';
    }
  };

  const loadCard = async () => {
    loadController = new AbortController();
    const signal = AbortSignal.any([controller.signal, loadController.signal]);

    const timeout = setTimeout(
      () => loadController.abort(new Error('Request timed out')),
      REQUEST_TIMEOUT
    );

    failedStep = 'load';
    discoveredItems.value = [];
    currentItem.value = null;
    currentCoverArt.value = null;
    phase.value = 'loading';

    try {
      discoveredItems.value = await fetchDiscovery(signal);

      if (signal.aborted || isUnmounted) return;

      if (discoveredItems.value.length === 0) {
        phase.value = 'empty';
        return;
      }

      const id = discoveredItems.value[0];
      const item = await fetchItem(id, signal);

      if (signal.aborted || isUnmounted) return;

      clearTimeout(timeout);

      const coverArt = await prepareCoverArt(id, signal);

      if (signal.aborted || isUnmounted) return;

      currentItem.value = item;
      currentCoverArt.value = coverArt;
      resetEdit();

      showCover();
      introduceStack();
      prefetchUpcomingItems(1);

      clearTimeout(timeout);
    } catch (err) {
      if (isUnmounted) return;

      console.error('[Qlaris] Unable to load card:', err);
      phase.value = 'error';
    } finally {
      clearTimeout(timeout);
    }
  };

  onMounted(() => {
    loadCard();
  });

  onBeforeUnmount(() => {
    isUnmounted = true;
    controller.abort();
    loadController?.abort();
    navigationController?.abort();

    prefetchControllers.forEach((prefetchController) => {
      prefetchController.abort();
    });

    prefetchControllers.clear();
    prefetchedItems.clear();
    prefetchQueue.length = 0;
    queuedPrefetches.clear();

    timers.forEach((timer) => clearTimeout(timer));
  });

  return {
    MIN_YEAR,
    MAX_YEAR,
    YEAR_INPUT_ID,
    PICKER_INPUT_ID,
    PICKER_BUTTON_ID,
    NEXT_BUTTON_ID,
    TOAST_DURATION,
    category,
    titleField,
    dateField,
    fields,
    titleLanguages,
    months,
    cardNumber,
    phase,
    isInfoOpen,
    triggerRef,
    cardRef,
    contentRef,
    collapseRef,
    isPreview,
    submission,
    card,
    isLoaded,
    isForm,
    isSubmitting,
    title,
    titleParts,
    description,
    subtitleParts,
    details,
    fieldId,
    status,
    goHome,
    toggleInfo,
    openPreview,
    closePreview,
    submit,
    ...editor,
    ...changes,
    ...skipApi,
  };
}