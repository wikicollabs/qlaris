<template>
  <section class="home-view">
    <div class="home-view__content">
      <h1 class="home-view__title">{{ $i18n('home-title') }}</h1>

      <category-carousel v-model:active-index="activeIndex" />

      <region-selector
        v-model:region="selectedRegion"
        @ready="emit('ready')"
      />

      <cdx-button
        class="home-view__start"
        action="progressive"
        weight="primary"
        size="large"
        @click="start"
        :disabled="selectedRegion === 'all'"
      >
        <cdx-icon :icon="cdxIconPlay" />
        <span class="home-view__start-label">{{ $i18n('home-start-button') }}</span>
      </cdx-button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconPlay } from '@wikimedia/codex-icons';
import { categories } from '../data/categories';
import CategoryCarousel from '../components/CategoryCarousel.vue';
import RegionSelector from '../components/RegionSelector.vue';
import { runViewTransition } from '../composables/UseAnimation.js';

const emit = defineEmits(['start', 'ready']);

const activeIndex = ref(0);
const selectedRegion = ref('all');

const activeCategory = computed(() => categories[activeIndex.value]);

const OPEN_CARD_TRANSITION_CLASS = 'vt-open-card';

const start = () =>
  runViewTransition(async () => {
    emit('start', {
          category: activeCategory.value.id,
          region: selectedRegion.value,
        });
    await nextTick();
  }, OPEN_CARD_TRANSITION_CLASS);
</script>

<style scoped>
.home-view {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  align-items: center;
  min-height: 25.5rem;
  padding: var(--spacing-100);
}

.home-view__content {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  gap: var(--spacing-100);
  width: 100%;
  max-width: var(--size-2800);
}

.home-view__title {
  margin: 0;
  color: var(--color-emphasized);
  font-family: var(--font-family-heading-main);
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-large);
  text-align: center;
}

.home-view__start {
  align-self: stretch;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-25);
  height: var(--size-275);
  padding: var(--spacing-6) var(--spacing-100);
}

.home-view__start-label {
  color: var(--color-inverted-fixed);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  text-align: center;
}

.home-view__start:disabled .home-view__start-label {
  color: inherit;
}

/* HOME VIEW - TABLET POTRAIT & DESKTOP */
@media (min-width: 640px) {
  .home-view {
    padding: var(--spacing-200);
  }
}
</style>

<style>
::view-transition-group(root),
::view-transition-group(category-cover),
::view-transition-group(category-cover-icon) {
  animation-duration: var(--transition-duration-medium);
  animation-timing-function: var(--transition-timing-function-system);
}

:root.vt-open-card {
  --vt-fade-duration: 200ms;
  --vt-hold-duration: 200ms;
  --vt-morph-duration: 200ms;
  --vt-easing: ease-out;
  --vt-keyframe-2-delay: calc(var(--vt-fade-duration) + var(--vt-hold-duration));
}

:root.vt-open-card::view-transition {
  background: var(--background-color-base);
}

:root.vt-open-card::view-transition-old(root) {
  animation: vt-fade-out var(--vt-fade-duration) var(--vt-easing) both;
}

:root.vt-open-card::view-transition-new(root) {
  animation: vt-fade-in var(--vt-fade-duration) var(--vt-easing) var(--vt-keyframe-2-delay) both;
}

:root.vt-open-card::view-transition-group(category-cover),
:root.vt-open-card::view-transition-old(category-cover),
:root.vt-open-card::view-transition-new(category-cover),
:root.vt-open-card::view-transition-group(category-cover-icon),
:root.vt-open-card::view-transition-old(category-cover-icon),
:root.vt-open-card::view-transition-new(category-cover-icon) {
  animation-duration: var(--vt-morph-duration);
  animation-timing-function: var(--vt-easing);
  animation-delay: var(--vt-keyframe-2-delay);
  animation-fill-mode: both;
}

:root.vt-open-card::view-transition-new(category-loading) {
  animation-duration: var(--vt-fade-duration);
  animation-timing-function: var(--vt-easing);
  animation-delay: var(--vt-keyframe-2-delay);
  animation-fill-mode: both;
}

@keyframes vt-fade-in {
  from {
    opacity: 0;
  }
}

@keyframes vt-fade-out {
  to {
    opacity: 0;
  }
}

</style>