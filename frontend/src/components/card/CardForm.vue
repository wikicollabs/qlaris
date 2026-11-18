<template>
  <card-form-info />

  <div
    :class="['card-view__body', { 'card-view__body--inactive': isInfoOpen }]"
    :inert="isInfoOpen || undefined"
  >
    <card-editors v-if="isEditing || isDateEditing || editingList" />

    <template v-else>
      <div class="card-view__form">
        <h4 v-if="!hasSavedValue" class="card-view__heading card-view__prompt">
          {{ $i18n('card-form-heading') }}
        </h4>
        <div class="card-view__fields">
          <div
            v-for="field in fields"
            :key="field.property"
            :class="['card-view__field', { 'card-view__field--edited': isEdited(field) }]"
          >
            <div class="card-view__field-header">
              <label class="card-view__label" :for="fieldId(field.property)">
                {{ field.label }} ({{ field.property }})
              </label>
              <span v-if="isEdited(field)" class="card-view__badge">
                <cdx-icon class="card-view__badge-icon" size="x-small" :icon="cdxIconNotBright" />
                <span class="card-view__badge-label">{{ $i18n('card-edited') }}</span>
              </span>
            </div>
            <div v-if="field === titleField && savedTitle" class="card-view__value">
              <div class="card-view__value-text">
                <p class="card-view__text card-view__value-title">{{ savedTitle.text }}</p>
                <p class="card-view__caption card-view__value-caption">{{ savedTitle.language?.label ?? savedTitle.language?.value ?? '' }}</p>
              </div>
              <cdx-button
                :id="fieldId(field.property)"
                weight="quiet"
                :aria-label="$i18n('card-edit-title')"
                @click="openEdit"
              >
                <cdx-icon :icon="cdxIconEdit" />
              </cdx-button>
            </div>
            <div v-else-if="field === dateField && savedDate" class="card-view__value">
              <div class="card-view__value-text">
                <p class="card-view__text card-view__value-title">{{ savedDate.text }}</p>
              </div>
              <cdx-button
                :id="fieldId(field.property)"
                weight="quiet"
                @click="openDateEdit"
              >
                <cdx-icon :icon="cdxIconEdit" />
              </cdx-button>
            </div>
            <div v-else-if="savedLists[field.property]" class="card-view__value">
              <div class="card-view__value-text">
                <p class="card-view__text card-view__value-title">{{ savedLists[field.property].text }}</p>
              </div>
              <cdx-button
                :id="fieldId(field.property)"
                weight="quiet"
                :aria-label="$i18n('card-edit-field')"
                @click="openListEdit(field)"
              >
                <cdx-icon :icon="cdxIconEdit" />
              </cdx-button>
            </div>
            <cdx-button
              v-else
              :id="fieldId(field.property)"
              class="card-view__field-button"
              @click="openField(field)"
            >
              <span class="card-view__placeholder">{{ $i18n(field.placeholder) }}</span>
              <cdx-icon :icon="field.icon" />
            </cdx-button>
          </div>
        </div>
      </div>

      <footer class="card-view__footer">
        <cdx-button
          :id="NEXT_BUTTON_ID"
          class="card-view__button"
          action="progressive"
          weight="primary"
          @click="openPreview"
        >
          {{ $i18n('card-next') }}
        </cdx-button>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { CdxButton, CdxIcon } from '@wikimedia/codex';
import { cdxIconEdit, cdxIconNotBright } from '@wikimedia/codex-icons';
import CardEditors from './CardEditors.vue';
import CardFormInfo from './CardFormInfo.vue';

const {
  NEXT_BUTTON_ID,
  titleField,
  dateField,
  fields,
  isInfoOpen,
  isEditing,
  isDateEditing,
  savedTitle,
  savedDate,
  editingList,
  savedLists,
  fieldId,
  hasSavedValue,
  isEdited,
  openPreview,
  openEdit,
  openDateEdit,
  openListEdit,
  openField,
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

.card-view__body--inactive {
  opacity: 0.25;
}

.card-view__body--inactive .card-view__form {
  overflow: hidden;
}

.card-view__form {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  min-height: 0;
  padding: var(--spacing-50);
  overflow-y: auto;
}

.card-view__prompt {
  padding: var(--spacing-50);
  color: var(--color-emphasized);
}

.card-view__fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.card-view__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-50);
}

.card-view__label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.card-view__field--edited {
  border-radius: var(--border-radius-base);
  background: var(--background-color-progressive-subtle);
}

.card-view__field-header {
  display: flex;
  align-items: flex-start;
}

.card-view__badge {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  align-items: center;
  gap: 0.125rem;
  margin-inline-start: auto;
  padding: 0 var(--spacing-50) 0 var(--spacing-25);
  border-radius: var(--border-radius-pill);
  background: var(--color-progressive);
}

.card-view__badge-icon {
  flex-shrink: 0;
  color: var(--color-inverted-fixed);
}

.card-view__badge-label {
  color: var(--color-inverted-fixed);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.card-view__field-button {
  gap: var(--spacing-25);
  padding-inline: calc(var(--spacing-50) - var(--border-width-base));
}

.card-view__placeholder {
  flex: 1 0 0;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  color: var(--color-neutral);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  text-align: start;
  text-overflow: ellipsis;
}

.card-view__value {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-25);
}

.card-view__value-text {
  flex: 1 1 0;
  min-width: 0;
  overflow-wrap: anywhere;
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
</style>