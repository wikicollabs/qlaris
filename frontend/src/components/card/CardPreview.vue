<template>
  <header class="card-view__preview-header">
    <h4 class="card-view__heading card-view__clamp">{{ $i18n('card-preview-heading') }}</h4>
  </header>

  <div class="card-view__body">
    <div class="card-view__preview">
      <div class="card-view__preview-item">
        <card-cover class="card-view__preview-cover" :cover="card.cover" />
        <div class="card-view__summary--stacked">
          <h4 class="card-view__heading card-view__clamp">{{ title }}</h4>
          <p class="card-view__text card-view__clamp">
            <template v-for="(part, index) in subtitleParts" :key="part.key">
              <template v-if="index">{{ ' · ' }}</template>
              <span :class="{ 'card-view__empty': part.empty }">{{ part.text }}</span>
            </template>
          </p>
          <p :class="['card-view__text', 'card-view__clamp', { 'card-view__empty': !card.description }]">
            {{ description }}
          </p>
        </div>
      </div>

      <div class="card-view__statements">
        <div v-if="!hasChanges" class="card-view__no-changes">
          <p class="card-view__no-changes-text">{{ $i18n('card-no-changes') }}</p>
        </div>
        <template v-else>
          <div class="card-view__statements-header">
            <cdx-icon size="small" :icon="hasEditedStatements ? cdxIconEdit : cdxIconAdd" />
            <span class="card-view__label">
              {{ $i18n(hasEditedStatements ? 'card-edited-statements' : 'card-new-statements') }}
            </span>
          </div>
          <div v-for="statement in previewStatements" :key="statement.property" class="card-view__statement">
            <span class="card-view__label">{{ statement.label }} ({{ statement.property }})</span>
            <div v-if="statement.changes" class="card-view__changes">
              <template v-for="change in statement.changes" :key="change.type">
                <p class="card-view__text">
                  <span class="card-view__change-label">{{ $i18n(change.labelKey) }}</span>
                  {{ change.text }}
                </p>
                <p v-if="change.caption" class="card-view__caption card-view__value-caption">
                  {{ change.caption }}
                </p>
              </template>
            </div>
            <div v-else>
              <p class="card-view__text card-view__value-title">{{ statement.text }}</p>
              <p v-if="statement.caption" class="card-view__caption card-view__value-caption">
                {{ statement.caption }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>

    <footer class="card-view__footer">
      <cdx-button class="card-view__button" @click="closePreview">
        {{ $i18n('card-back') }}
      </cdx-button>
      <cdx-button class="card-view__button" action="progressive" weight="primary" @click="submit">
        {{ $i18n('card-submit') }}
      </cdx-button>
    </footer>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconAdd, cdxIconEdit } from '@wikimedia/codex-icons';
import CardCover from './CardCover.vue';

const {
  card,
  title,
  description,
  subtitleParts,
  hasChanges,
  hasEditedStatements,
  previewStatements,
  closePreview,
  submit,
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

.card-view__clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.card-view__caption {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.card-view__body {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  min-height: 0;
  transition: opacity 0.25s var(--cubic-bezier-base, ease);
}

.card-view__label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.card-view__value-title {
  display: flex;
  align-items: center;
  min-height: var(--size-200);
  line-height: var(--line-height-small);
}

.card-view__value-caption {
  color: var(--color-subtle);
}

.card-view__footer {
  display: flex;
  flex-shrink: 0;
  gap: var(--spacing-50);
  padding: var(--spacing-100);
  border-top: var(--border-width-base) solid var(--border-color-base);
}

.card-view__button {
  flex: 1 0 0;
}

.card-view__preview-header {
  flex-shrink: 0;
  padding: var(--spacing-100);
  background: var(--color-gray600);
  color: var(--color-inverted-fixed);
}

.card-view__preview {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  gap: var(--spacing-100);
  min-height: 0;
  padding: var(--spacing-100);
  overflow-y: auto;
}

.card-view__preview-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}

.card-view__preview-cover {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border-radius: var(--border-radius-base);
  object-fit: cover;
}

.card-view__summary--stacked {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.card-view__statements {
  position: relative;
  display: flex;
  flex-direction: column;
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral);
  overflow-wrap: anywhere;
}

.card-view__statements::before {
  content: '';
  position: absolute;
  top: calc(-0.5rem - var(--border-width-base) / 2);
  left: 50%;
  width: 1rem;
  height: 1rem;
  border-right: var(--border-width-base) solid var(--border-color-base);
  border-bottom: var(--border-width-base) solid var(--border-color-base);
  background: var(--background-color-neutral);
  transform: translateX(-50%) rotate(-135deg);
}

.card-view__no-changes {
  padding: var(--spacing-50) var(--spacing-75);
}

.card-view__no-changes-text {
  margin: 0;
  color: var(--color-subtle);
  font-size: var(--font-size-medium);
  font-style: italic;
  font-weight: 400;
  line-height: var(--line-height-medium);
  text-align: center;
}

.card-view__statements-header,
.card-view__statement {
  padding: var(--spacing-50) var(--spacing-75);
}

.card-view__statements-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}

.card-view__statement {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.card-view__changes {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: var(--size-200);
  line-height: var(--line-height-small);
}

.card-view__change-label {
  font-weight: var(--font-weight-bold);
}
</style>