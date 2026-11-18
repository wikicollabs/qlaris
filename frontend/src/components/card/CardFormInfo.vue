<template>
  <header
    :class="['card-view__item', { 'card-view__item--open': isInfoOpen }]"
    @pointerdown="onHeaderPointerDown"
  >
    <div class="card-view__item-text">
      <h4 :class="['card-view__heading', { 'card-view__entity--collapsed': !isInfoOpen }]">
        <span class="card-view__entity-text">{{ titleParts.textPart }}</span>
        <span class="card-view__entity-id">{{ titleParts.idPart }}</span>
      </h4>

      <div class="card-view__fold card-view__fold--subtitle">
        <div class="card-view__fold-inner">
          <p class="card-view__text card-view__ellipsis card-view__subtitle">
            <template v-for="(part, index) in subtitleParts" :key="part.key">
              <template v-if="index">{{ ' · ' }}</template>
              <span :class="{ 'card-view__empty': part.empty }">{{ part.text }}</span>
            </template>
          </p>
        </div>
      </div>

      <div v-for="detail in details" :key="detail.property" class="card-view__fold card-view__fold--more">
        <div class="card-view__fold-inner">
          <p
            :class="[
              'card-view__text',
              { 'card-view__text--paragraph': detail.paragraph, 'card-view__text--stacked': detail.stacked },
            ]"
          >
            {{ detail.property }}:
            <span
              :class="{ 'card-view__detail-value--bold': detail.bold, 'card-view__empty': detail.empty }"
            >{{ detail.value }}</span>
          </p>
        </div>
      </div>
    </div>

    <div v-if="card.coverSource" class="card-view__fold card-view__fold--more">
      <div class="card-view__fold-inner">
        <p class="card-view__caption card-view__source">
          {{ $i18n('card-cover-source', card.coverSource) }}
        </p>
      </div>
    </div>

    <div class="card-view__collapse-bar">
      <div class="card-view__collapse-inner">
        <cdx-button
          ref="collapseRef"
          class="card-view__collapse"
          weight="quiet"
          :aria-label="$i18n('card-info-collapse')"
          @click="toggleInfo"
        >
          <cdx-icon class="card-view__collapse-icon" :icon="cdxIconCollapse" />
        </cdx-button>
      </div>
    </div>

    <button
      ref="triggerRef"
      type="button"
      class="card-view__thumbnail"
      :aria-label="$i18n('card-info-expand')"
      :aria-expanded="isInfoOpen"
      :inert="isInfoOpen || undefined"
      @click="toggleInfo"
    >
      <card-cover class="card-view__thumbnail-image" :cover="card.cover" />
      <span class="card-view__info" aria-hidden="true">
        <cdx-icon class="card-view__info-icon" size="small" :icon="cdxIconInfo" />
      </span>
    </button>
  </header>
</template>

<script setup>
import { inject } from 'vue';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconCollapse, cdxIconInfo } from '@wikimedia/codex-icons';
import CardCover from './CardCover.vue';

const {
  isInfoOpen,
  triggerRef,
  collapseRef,
  card,
  titleParts,
  subtitleParts,
  details,
  toggleInfo,
  onHeaderPointerDown,
} = inject('cardView');
</script>

<style scoped>
.card-view__heading {
  margin: 0;
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

.card-view__text {
  margin: 0;
}

.card-view__empty {
  font-style: italic;
}

.card-view__detail-value--bold {
  font-weight: var(--font-weight-bold);
}

.card-view__ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-view__entity--collapsed {
  display: flex;
}

.card-view__entity--collapsed .card-view__entity-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.card-view__entity--collapsed .card-view__entity-id {
  flex-shrink: 0;
  white-space: pre;
}

.card-view__text--stacked > span {
  display: block;
}

.card-view__item {
  --item-gap: var(--spacing-100);
  --item-thumb: 4rem;
  --item-cover: 8rem;
  --item-duration: 0.2s;
  --item-ease: cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  flex-shrink: 0;
  padding: var(--item-gap);
  background: var(--cover-background);
  color: var(--color-inverted-fixed);
  overflow: hidden;
  transition: padding-block-end var(--item-duration) var(--item-ease);
  touch-action: none;
  user-select: none;
}

.card-view__item--open {
  flex-shrink: 1;
  min-height: 0;
  padding-block-end: 0;
  overflow-y: auto;
  touch-action: pan-y;
  user-select: auto;
}

.card-view__item-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  box-sizing: border-box;
  min-width: 0;
  min-height: var(--item-thumb);
  padding-inline-end: calc(var(--item-thumb) + var(--item-gap));
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  overflow-wrap: anywhere;
  transition:
    gap var(--item-duration) var(--item-ease),
    padding-block-start var(--item-duration) var(--item-ease),
    padding-inline-end var(--item-duration) var(--item-ease),
    min-height var(--item-duration) var(--item-ease);
}

.card-view__item--open .card-view__item-text {
  align-items: flex-start;
  align-self: stretch;
  gap: var(--spacing-25);
  min-height: 0;
  padding-block-start: calc(var(--item-cover) + var(--item-gap));
  padding-inline-end: 0;
}

.card-view__fold {
  display: grid;
  min-height: 0;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    visibility 0s linear var(--item-duration);
}

.card-view__fold-inner {
  min-height: 0;
  overflow: hidden;
}

.card-view__fold--subtitle {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    margin-block-end var(--item-duration) var(--item-ease),
    visibility 0s linear;
}

.card-view__fold--more {
  grid-template-rows: 0fr;
  visibility: hidden;
}

.card-view__item-text > .card-view__fold--more {
  line-height: var(--line-height-small);
}

.card-view__source {
  padding-block-start: var(--item-gap);
  overflow-wrap: anywhere;
}

.card-view__item--open .card-view__fold--subtitle {
  margin-block-end: calc(var(--spacing-25) * -1);
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    margin-block-end var(--item-duration) var(--item-ease),
    visibility 0s linear var(--item-duration);
}

.card-view__item--open .card-view__fold--more {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    visibility 0s linear;
}

.card-view__subtitle {
  transition: transform var(--item-duration) var(--item-ease);
}

.card-view__item--open .card-view__subtitle {
  transform: translateY(100%);
}

.card-view__thumbnail {
  position: absolute;
  top: var(--item-gap);
  inset-inline-start: calc(100% - var(--item-gap) - var(--item-thumb));
  width: var(--item-thumb);
  height: var(--item-thumb);
  padding: 0;
  border: 0;
  border-radius: var(--border-radius-base);
  background: none;
  cursor: pointer;
  transition:
    inset-inline-start var(--item-duration) var(--item-ease),
    width var(--item-duration) var(--item-ease),
    height var(--item-duration) var(--item-ease);
}

.card-view__item--open .card-view__thumbnail {
  inset-inline-start: var(--item-gap);
  width: var(--item-cover);
  height: var(--item-cover);
  cursor: default;
}

.card-view__thumbnail-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius-base);
  object-fit: cover;
}

.card-view__info {
  position: absolute;
  right: var(--spacing-12);
  bottom: var(--spacing-12);
  display: inline-flex;
  padding: var(--spacing-12);
  border-radius: var(--border-radius-circle);
  background: var(--background-color-progressive);
  transition: opacity 0.1s linear;
}

.card-view__item--open .card-view__info {
  opacity: 0;
}

.card-view__info-icon {
  color: var(--color-inverted-fixed);
}

.card-view__text--paragraph {
  line-height: var(--line-height-medium);
}

.card-view__caption {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.card-view__collapse-bar {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: grid;
  grid-template-rows: 0fr;
  background: var(--cover-background);
  visibility: hidden;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    visibility 0s linear var(--item-duration);
}

.card-view__item--open .card-view__collapse-bar {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows var(--item-duration) var(--item-ease),
    visibility 0s linear;
}

.card-view__collapse-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.card-view__collapse {
  margin-block-start: var(--item-gap);
}

.card-view__collapse.cdx-button:enabled:hover,
.card-view__collapse.cdx-button:enabled:active {
  background-color: var(--background-color-transparent);
  mix-blend-mode: normal;
}

.card-view__collapse-icon {
  color: var(--color-inverted-fixed);
}
</style>