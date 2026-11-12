<template>
  <div class="category-carousel">
    <p class="category-carousel__heading">{{ $i18n('home-carousel-heading') }}</p>

    <div
      class="category-carousel__stage"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="resetSwipe"
    >
      <cdx-button
        class="category-carousel__arrow category-carousel__arrow--previous"
        weight="quiet"
        @click="shiftBy(-1)"
      >
        <cdx-icon :icon="cdxIconPrevious" />
      </cdx-button>

      <div
        v-for="slide in slides"
        :key="slide.id"
        :class="[
          'category-carousel__cover',
          `category-carousel__cover--${slide.position}`,
          { 'category-carousel__cover--wrapping': slide.isWrapping },
        ]"
        :style="{
          '--cover-background': slide.background,
          '--cover-icon': slide.iconColor,
        }"
      >
        <cdx-icon class="category-carousel__cover-icon" :icon="slide.icon" />
      </div>

      <cdx-button
        class="category-carousel__arrow category-carousel__arrow--next"
        weight="quiet"
        @click="shiftBy(1)"
      >
        <cdx-icon :icon="cdxIconNext" />
      </cdx-button>
    </div>

    <p class="category-carousel__label" aria-live="polite">{{ activeCategory.label }}</p>

    <div class="category-carousel__indicators" aria-hidden="true">
      <span
        v-for="(category, index) in categories"
        :key="category.id"
        :class="['category-carousel__dot', { 'category-carousel__dot--active': index === activeIndex }]"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconNext, cdxIconPrevious } from '@wikimedia/codex-icons';
import { categories } from '../data/categories';

const VISIBLE_POSITIONS = { '-1': 'left', 0: 'center', 1: 'right' };
const SWIPE_THRESHOLD = 40;
const total = categories.length;

const activeIndex = defineModel('activeIndex', { default: 0 });
const previousIndex = ref(0);

const activeCategory = computed(() => categories[activeIndex.value]);

const getOffset = (index, active) => {
  const distance = (index - active + total) % total;
  return distance > Math.floor(total / 2) ? distance - total : distance;
};

const getPosition = (offset) =>
  VISIBLE_POSITIONS[offset] ?? (offset < 0 ? 'far-left' : 'far-right');

const slides = computed(() =>
  categories.map((category, index) => {
    const offset = getOffset(index, activeIndex.value);
    const previousOffset = getOffset(index, previousIndex.value);

    return {
      ...category,
      position: getPosition(offset),
      isWrapping: Math.abs(offset - previousOffset) > 1,
    };
  })
);

const shiftBy = (step) => {
  previousIndex.value = activeIndex.value;
  activeIndex.value = (activeIndex.value + step + total) % total;
};

let swipeStart = null;

const resetSwipe = () => {
  swipeStart = null;
};

const onPointerDown = (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }

  swipeStart = { x: event.clientX, y: event.clientY };
};

const onPointerUp = (event) => {
  if (!swipeStart) {
    return;
  }

  const deltaX = event.clientX - swipeStart.x;
  const deltaY = event.clientY - swipeStart.y;
  resetSwipe();

  if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) {
    return;
  }

  shiftBy(deltaX < 0 ? 1 : -1);
};
</script>

<style scoped>
.category-carousel {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--spacing-50);
}

.category-carousel__heading {
  margin: 0;
  color: var(--color-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  text-align: center;
}

.category-carousel__stage {
  position: relative;
  height: 8rem;
  margin-inline: 0;
  overflow: hidden;
  isolation: isolate;
  touch-action: pan-y;
  user-select: none;
}

.category-carousel__stage::before,
.category-carousel__stage::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  width: 5rem;
  pointer-events: none;
}

.category-carousel__stage::before {
  left: 0;
  background: linear-gradient(to right, var(--background-color-base), transparent);
}

.category-carousel__stage::after {
  right: 0;
  background: linear-gradient(to left, var(--background-color-base), transparent);
}

.category-carousel__arrow {
  position: absolute;
  top: 50%;
  z-index: 4;
  transform: translateY(-50%);
}

.category-carousel__arrow--previous {
  left: 0;
}

.category-carousel__arrow--next {
  right: 0;
}

.category-carousel__cover,
.category-carousel__cover-icon {
  transition-duration: var(--transition-duration-medium, 0.25s);
  transition-timing-function: var(--transition-timing-function-system);
}

.category-carousel__cover {
  --cover-offset: 0rem;
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 6rem;
  height: 6rem;
  border-radius: var(--border-radius-base);
  background: var(--cover-background);
  opacity: 0.25;
  transform: translate(calc(-50% + var(--cover-offset)), -50%);
  transition-property: transform, width, height, opacity;
}

.category-carousel__cover--left {
  --cover-offset: -8rem;
}

.category-carousel__cover--right {
  --cover-offset: 8rem;
}

.category-carousel__cover--far-left {
  --cover-offset: -16rem;
}

.category-carousel__cover--far-right {
  --cover-offset: 16rem;
}

.category-carousel__cover--center {
  z-index: 2;
  width: 8rem;
  height: 8rem;
  opacity: 1;
  view-transition-name: category-cover;
}

.category-carousel__cover-icon {
  color: var(--cover-icon);
  width: 3rem;
  height: 3rem;
  transition-property: width, height;
}

.category-carousel__cover--center .category-carousel__cover-icon {
  width: 4rem;
  height: 4rem;
  view-transition-name: category-cover-icon;
}

.category-carousel__cover--wrapping {
  z-index: 0;
}

.category-carousel__label {
  margin: 0;
  color: var(--color-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  text-align: center;
}

.category-carousel__indicators {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-50);
}

.category-carousel__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--border-radius-circle);
  background: var(--background-color-disabled);
}

.category-carousel__dot--active {
  background: var(--background-color-backdrop-dark);
}
</style>