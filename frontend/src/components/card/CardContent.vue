<template>
  <section :class="['card-view', { 'card-view--loaded': isLoaded, 'card-view--exiting': isExiting || isStacked }]">
    <header class="card-view__header">
      <cdx-button weight="quiet" @click="goHome">
        <cdx-icon :icon="cdxIconHome" />
      </cdx-button>
      <h1 v-if="isLoaded || isExiting || isStacked" class="card-view__title">{{ $i18n('card-title', cardNumber) }}</h1>
    </header>

    <div class="card-view__layout">
      <div ref="contentRef" class="card-view__content">
        <div
          ref="cardRef"
          :class="[
            'card-view__card',
            `card-view__card--${phase}`,
            { 'card-view__card--success': submission === 'success', 'card-view__card--exiting': isExiting },
          ]"
          :style="{
            '--cover-background': category.background,
            '--cover-icon': category.iconColor,
            '--card-cover': typeof card.cover === 'string' ? `url('${card.cover}')` : 'none',
          }"
        >
          <div v-if="submission === 'submitting'" class="card-view__result">
            <div class="card-view__submitting">
              <cdx-progress-indicator>{{ $i18n('card-submit-progress') }}</cdx-progress-indicator>
              <span class="card-view__submitting-text" aria-hidden="true">{{ $i18n('card-submit-progress') }}</span>
            </div>
          </div>

          <cdx-icon
            v-else-if="submission === 'success'"
            class="card-view__success-icon"
            :icon="cdxIconSuccess"
            :icon-label="$i18n('card-submit-success')"
          />

          <div v-else-if="submission === 'failed'" class="card-view__result card-view__result--failed">
            <cdx-icon class="card-view__status-icon" :icon="cdxIconError" />
            <div class="card-view__status-text" role="alert">
              <h4 class="card-view__heading card-view__status-heading">{{ $i18n('card-submit-error-heading') }}</h4>
              <p class="card-view__text card-view__status-message">{{ $i18n('card-submit-error-message') }}</p>
            </div>
            <cdx-button action="progressive" weight="primary" size="large" @click="submit">
              {{ $i18n('card-submit-error-action') }}
            </cdx-button>
          </div>

          <card-preview v-else-if="isPreview" />

          <card-form v-else-if="isForm" />

          <template v-else-if="isLoaded">
            <card-cover class="card-view__cover" :cover="card.cover" />
            <div class="card-view__details">
              <h4 class="card-view__heading">{{ title }}</h4>
              <p class="card-view__text">
                <template v-for="(part, index) in subtitleParts" :key="part.key">
                  <template v-if="index">{{ ' · ' }}</template>
                  <span :class="{ 'card-view__empty': part.empty }">{{ part.text }}</span>
                </template>
              </p>
              <p :class="['card-view__text', 'card-view__clamp', { 'card-view__empty': !card.description }]">
                {{ description }}
              </p>
            </div>
          </template>

          <template v-else-if="status">
            <cdx-icon class="card-view__status-icon" :icon="status.icon" />
            <div class="card-view__status-text" :role="status.role">
              <h4 class="card-view__heading card-view__status-heading">{{ status.heading }}</h4>
              <p v-if="status.message" class="card-view__text card-view__status-message">
                {{ status.message }}
              </p>
            </div>
            <cdx-button action="progressive" weight="primary" @click="status.onAction">
              {{ status.actionLabel }}
            </cdx-button>
          </template>

          <template v-else>
            <cdx-icon class="card-view__card-icon" :icon="category.icon" />
            <cdx-progress-indicator class="card-view__loading" show-label>
              {{ $i18n('card-loading') }}
            </cdx-progress-indicator>
          </template>
        </div>

        <div class="card-view__stack card-view__stack--1" aria-hidden="true" />
        <div class="card-view__stack card-view__stack--2" aria-hidden="true" />
        <div class="card-view__stack card-view__stack--3" aria-hidden="true" />
      </div>
    </div>

    <div class="card-view__actions">
      <cdx-button class="card-view__skip" size="large" weight="quiet" :disabled="isSubmitting" @click="skip">
        <cdx-icon class="card-view__skip-icon" :icon="cdxIconSkip" />
        {{ $i18n('card-skip-button') }}
      </cdx-button>
    </div>

    <card-toast />

    <teleport to="body">
      <div
        v-if="isPickerOpen"
        class="card-view__overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="$i18n('card-open-calendar')"
        @click.self="closePicker"
        @keydown.esc="closePicker"
      >
        <cdx-text-input
          :id="PICKER_INPUT_ID"
          v-model="dateValue"
          class="card-view__overlay-input"
          input-type="date"
          min="0001-01-01"
          max="9999-12-31"
          @change="closePicker"
        />
      </div>
    </teleport>
  </section>
</template>

<script setup>
import { inject } from 'vue';
import { CdxButton, CdxIcon, CdxProgressIndicator, CdxTextInput } from '@wikimedia/codex';
import { cdxIconError, cdxIconHome, cdxIconSuccess } from '@wikimedia/codex-icons';
import CardCover from './CardCover.vue';
import CardForm from './CardForm.vue';
import CardPreview from './CardPreview.vue';
import CardToast from './CardToast.vue';

const cdxIconSkip =
  '<g transform="translate(3 4)"><path d="M7 5.5V6.5L1.5 12H0V0H1.5L7 5.5Z"/><path d="M14 5.5V6.5L8.5 12H7V0H8.5L14 5.5Z"/></g>';

const {
  PICKER_INPUT_ID,
  category,
  cardNumber,
  phase,
  cardRef,
  contentRef,
  isPreview,
  submission,
  dateValue,
  isPickerOpen,
  card,
  isLoaded,
  isForm,
  isSubmitting,
  isExiting,
  isStacked,
  title,
  description,
  subtitleParts,
  status,
  goHome,
  closePicker,
  skip,
  submit,
} = inject('cardView');
</script>

<style scoped>
.card-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--background-color-neutral);
}

.card-view__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50);
  height: 3.375rem;
  padding: var(--spacing-50) var(--spacing-75) var(--spacing-50) var(--spacing-100);
}

.card-view__header::after {
  content: '';
  flex-shrink: 0;
  width: var(--size-200);
}

.card-view__title {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  align-self: stretch;
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  text-align: center;
}

.card-view__layout {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: 1rem;
}

.card-view__content {
  --stack-overlap: 1rem;
  --stack-shadow-reach: 2.5rem;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  max-width: 28rem;
}

.card-view__card {
  position: relative;
  z-index: 4;
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-height: 40rem;
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: 1rem;
  background: var(--cover-background);
  box-shadow: var(--box-shadow-medium);
  overflow: hidden;
  view-transition-name: category-cover;
}

.card-view__card--cover {
  gap: var(--spacing-75);
  padding: var(--spacing-100);
  background: var(--card-cover) var(--background-color-neutral) 50% / cover no-repeat;
}

.card-view__card--cover::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--background-color-cover-overlay);
  backdrop-filter: blur(2rem);
}

.card-view__card--form {
  justify-content: flex-start;
  align-items: stretch;
  background: var(--background-color-base);
  box-shadow: var(--box-shadow-medium);
}

.card-view__card--error,
.card-view__card--empty {
  gap: var(--spacing-75);
  padding: var(--spacing-100);
  box-shadow: var(--box-shadow-medium);
}

.card-view__card--error {
  --status-color: var(--color-error);
  border-color: var(--border-color-error);
  background: var(--background-color-error-subtle);
}

.card-view__card--empty {
  --status-color: var(--color-notice);
  background: var(--background-color-neutral-subtle);
}

.card-view__card--success {
  justify-content: center;
  align-items: center;
  border-color: var(--border-color-success);
  background: var(--color-success);
}

.card-view__card--exiting {
  opacity: 0 !important;
  visibility: hidden !important;
}

.card-view__ghost {
  position: absolute;
  flex: none;
  margin: 0;
  pointer-events: none;
  view-transition-name: none;
}

.card-view__ghost--leaving {
  z-index: 5;
}

.card-view__ghost--under {
  z-index: 3;
}

.card-view__ghost--dissolve {
  z-index: 5;
}

.card-view__ghost--backdrop {
  z-index: 3;
  background: var(--background-color-base);
}

.card-view__result {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  align-self: stretch;
  gap: var(--spacing-75);
  padding: var(--spacing-100);
  background: var(--background-color-base);
}

.card-view__result--failed {
  --status-color: var(--color-error);
}

.card-view__submitting {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.card-view__submitting-text {
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
}

.card-view__success-icon {
  flex-shrink: 0;
  width: 7.2rem;
  height: 7.2rem;
  margin: 0.4rem;
  color: var(--color-inverted-fixed);
}

.card-view__cover {
  flex-shrink: 0;
  width: 8rem;
  height: 8rem;
  border-radius: var(--border-radius-base);
  object-fit: cover;
}

.card-view__details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  align-self: stretch;
  color: var(--color-inverted-fixed);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-medium);
  text-align: center;
  overflow-wrap: anywhere;
}

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

.card-view__clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.card-view__stack {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  visibility: hidden;
  height: 1.5rem;
  margin-top: calc(var(--stack-overlap) * -1);
  border: var(--border-width-base) solid var(--border-color-base);
  border-top: 0;
  border-radius: 0 0 1rem 1rem;
  background: var(--background-color-base);
  box-shadow: var(--box-shadow-medium);

  mask-image:
    linear-gradient(#000, #000),
    radial-gradient(circle at 100% 0, transparent calc(var(--stack-overlap) - 0.0625rem), #000 var(--stack-overlap)),
    radial-gradient(circle at 0 0, transparent calc(var(--stack-overlap) - 0.0625rem), #000 var(--stack-overlap)),
    linear-gradient(#000, #000),
    linear-gradient(#000, #000),
    linear-gradient(#000, #000);
  mask-size:
    100% calc(100% - var(--stack-overlap)),
    var(--stack-overlap) var(--stack-overlap),
    var(--stack-overlap) var(--stack-overlap),
    calc(100% + 2 * var(--stack-shadow-reach)) var(--stack-shadow-reach),
    var(--stack-shadow-reach) calc(100% + 2 * var(--stack-shadow-reach)),
    var(--stack-shadow-reach) calc(100% + 2 * var(--stack-shadow-reach));
  mask-position:
    0 100%,
    0 0,
    100% 0,
    left calc(var(--stack-shadow-reach) * -1) bottom calc(var(--stack-shadow-reach) * -1),
    left calc(var(--stack-shadow-reach) * -1) top calc(var(--stack-shadow-reach) * -1),
    right calc(var(--stack-shadow-reach) * -1) top calc(var(--stack-shadow-reach) * -1);
  mask-repeat: no-repeat;
  mask-clip: no-clip;
}

.card-view__stack--1 {
  z-index: 2;
}

.card-view__stack--2 {
  z-index: 1;
}

.card-view__stack--3 {
  position: absolute;
  inset-inline: 0;
  top: calc(100% - var(--stack-overlap));
  z-index: 0;
  margin-top: 0;
  opacity: 0;
  pointer-events: none;
}

.card-view__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 var(--spacing-100) var(--spacing-100);
  visibility: hidden;
}

.card-view--loaded .card-view__stack,
.card-view--loaded .card-view__actions,
.card-view--exiting .card-view__stack,
.card-view--exiting .card-view__actions {
  visibility: visible;
}

.card-view__skip {
  width: 100%;
  gap: var(--spacing-25);
  line-height: var(--line-height-small);
}

.card-view__skip-icon {
  color: inherit;
}

.card-view__card-icon {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  color: var(--cover-icon);
  view-transition-name: category-cover-icon;
}

.card-view__status-icon {
  flex-shrink: 0;
  width: 3.6rem;
  height: 3.6rem;
  margin: 0.2rem;
  color: var(--status-color);
}

.card-view__status-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  align-self: stretch;
  text-align: center;
}

.card-view__status-heading {
  color: var(--color-emphasized);
}

.card-view__status-message {
  color: var(--color-base);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
}

.card-view__loading {
  --accent-color-base: var(--color-inverted-fixed);
  position: absolute;
  bottom: var(--spacing-400);
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-inverted-fixed);
  font-size: var(--font-size-medium);
  font-style: normal;
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  view-transition-name: category-loading;
}

.card-view__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-overlay-backdrop);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  background: var(--background-color-backdrop-light);
}

.card-view__overlay-input {
  width: 100%;
  max-width: var(--size-2800);
}

@media (min-width: 40rem) and (max-width: 63.9375rem) {
  .card-view__header {
    height: 4rem;
    padding: var(--spacing-75) var(--spacing-200);
  }

  .card-view__layout {
    padding: 1.5rem;
  }

  .card-view__actions {
    padding: 0 1.5rem 1.5rem;
  }

  .card-view__skip {
    max-width: 28rem;
  }
}

@media (min-width: 64rem) {
  .card-view__header {
    height: 4rem;
    padding: var(--spacing-75) var(--spacing-200);
  }

  .card-view__layout {
    padding: 1.5rem;
  }

  .card-view__actions {
    padding: 0 1.5rem 1.5rem;
  }

  .card-view__skip {
    max-width: 28rem;
  }
}
</style>