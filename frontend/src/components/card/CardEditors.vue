<template>
  <div v-if="isEditing" class="card-view__form">
    <div class="card-view__editor">
      <div class="card-view__editor-fields">
        <cdx-field
          class="card-view__editor-field"
          :status="titleError ? 'error' : 'default'"
          :messages="{ error: $i18n('card-title-empty-error') }"
        >
          <template #label>
            {{ titleField.label }} ({{ titleField.property }})
          </template>
          <cdx-lookup
            v-model:selected="titleSelection"
            v-model:input-value="titleInput"
            class="card-view__lookup"
            :menu-items="titleSuggestions"
            :placeholder="$i18n('card-enter-album-title')"
            @input="onTitleInput"
            @blur="onTitleBlur"
          />
        </cdx-field>
        <cdx-field class="card-view__editor-field">
          <template #label>
            {{ $i18n('card-title-language') }}
          </template>
          <searchable-select
            v-model:selected="titleLanguage"
            :menu-items="titleLanguages"
            :default-label="$i18n('card-select-title-language')"
            :status="titleLanguageError ? 'error' : 'default'"
            :search-placeholder="$i18n('card-search-language')"
            :no-results-text="$i18n('card-no-results')"
            :aria-label="$i18n('card-title-language')"
            @blur="onTitleLanguageBlur"
          />
          <cdx-message v-if="titleLanguageError" class="card-view__error" type="error" inline>
            {{ $i18n('card-title-language-empty-error') }}
          </cdx-message>
        </cdx-field>
      </div>
      <div class="card-view__editor-actions">
        <cdx-button class="card-view__button" @click="closeEdit">
          {{ $i18n('card-cancel') }}
        </cdx-button>
        <cdx-button class="card-view__button" action="progressive" :disabled="!canSubmit" @click="saveTitle">
          {{ $i18n('card-done') }}
        </cdx-button>
      </div>
    </div>
  </div>

  <div v-else-if="isDateEditing" class="card-view__form">
    <div class="card-view__editor">
      <div class="card-view__editor-fields">
        <label class="card-view__label" :for="datePrecision === 'day' ? undefined : YEAR_INPUT_ID">
          {{ dateField.label }} ({{ dateField.property }})
        </label>
        <div class="card-view__date">
          <div class="card-view__precision">
            <span class="card-view__precision-label">{{ $i18n('card-precision') }}</span>
            <cdx-toggle-button-group v-model="datePrecision" :buttons="precisionOptions" />
          </div>
          <div class="card-view__date-input">
            <cdx-select
              v-if="datePrecision === 'month'"
              v-model:selected="dateMonth"
              class="card-view__select"
              :aria-label="$i18n('card-select-month')"
              :menu-items="months"
              :default-label="$i18n('card-select-month')"
            />
            <div v-if="datePrecision === 'day'" class="card-view__input-group">
              <cdx-text-input
                :model-value="dayLabel"
                class="card-view__control card-view__day"
                readonly
                tabindex="-1"
                :aria-label="`${dateField.label} (${dateField.property})`"
                :placeholder="$i18n('card-select-date')"
              />
              <cdx-button
                :id="PICKER_BUTTON_ID"
                class="card-view__step"
                :aria-label="$i18n('card-open-calendar')"
                @click="openDatePicker"
              >
                <cdx-icon :icon="cdxIconCalendar" />
              </cdx-button>
            </div>
            <div v-else :key="datePrecision" class="card-view__input-field">
              <div class="card-view__input-group">
                <cdx-text-input
                  :id="YEAR_INPUT_ID"
                  v-model="dateYear"
                  class="card-view__control card-view__year"
                  input-type="number"
                  :min="MIN_YEAR"
                  :max="MAX_YEAR"
                  :status="yearError ? 'error' : 'default'"
                  :placeholder="$i18n('card-enter-year')"
                  @blur="onYearBlur"
                />
                <cdx-button class="card-view__step" :aria-label="$i18n('card-year-decrease')" @click="stepYear(-1)">
                  <cdx-icon :icon="cdxIconSubtract" />
                </cdx-button>
                <cdx-button class="card-view__step" :aria-label="$i18n('card-year-increase')" @click="stepYear(1)">
                  <cdx-icon :icon="cdxIconAdd" />
                </cdx-button>
              </div>
              <cdx-message v-if="yearError" type="error" inline>
                {{ $i18n(yearError) }}
              </cdx-message>
            </div>
          </div>
        </div>
      </div>
      <div class="card-view__editor-actions">
        <cdx-button class="card-view__button" @click="closeDateEdit">
          {{ $i18n('card-cancel') }}
        </cdx-button>
        <cdx-button class="card-view__button" action="progressive" :disabled="!canSubmitDate" @click="saveDate">
          {{ $i18n('card-done') }}
        </cdx-button>
      </div>
    </div>
  </div>

  <div v-else-if="editingList" class="card-view__form">
    <div class="card-view__editor">
      <div class="card-view__editor-fields">
        <cdx-field class="card-view__editor-field">
          <template #label>
            {{ editingList.label }} ({{ editingList.property }})
          </template>
          <cdx-multiselect-lookup
            v-model:input-chips="listChips"
            v-model:selected="listSelected"
            v-model:input-value="listInput"
            class="card-view__chips"
            :menu-items="listMenuItems"
            :placeholder="$i18n(editingList.searchPlaceholder)"
            @input="onListInput"
          />
        </cdx-field>
      </div>
      <div class="card-view__editor-actions">
        <cdx-button class="card-view__button" @click="closeListEdit">
          {{ $i18n('card-cancel') }}
        </cdx-button>
        <cdx-button class="card-view__button" action="progressive" :disabled="!canSubmitList" @click="saveList">
          {{ $i18n('card-done') }}
        </cdx-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import {
  CdxButton,
  CdxField,
  CdxIcon,
  CdxLookup,
  CdxMessage,
  CdxMultiselectLookup,
  CdxSelect,
  CdxTextInput,
  CdxToggleButtonGroup,
} from '@wikimedia/codex';
import { cdxIconAdd, cdxIconCalendar, cdxIconSubtract } from '@wikimedia/codex-icons';
import SearchableSelect from '../SearchableSelect.vue';

const {
  MIN_YEAR,
  MAX_YEAR,
  YEAR_INPUT_ID,
  PICKER_BUTTON_ID,
  titleField,
  dateField,
  titleLanguages,
  precisionOptions,
  months,
  isEditing,
  isDateEditing,
  editingList,
  titleSelection,
  titleInput,
  titleLanguage,
  titleSuggestions,
  datePrecision,
  dateMonth,
  dateYear,
  listChips,
  listSelected,
  listInput,
  listMenuItems,
  canSubmit,
  canSubmitDate,
  canSubmitList,
  titleError,
  titleLanguageError,
  yearError,
  dayLabel,
  closeEdit,
  saveTitle,
  closeDateEdit,
  saveDate,
  closeListEdit,
  saveList,
  onTitleInput,
  onTitleBlur,
  onTitleLanguageBlur,
  onYearBlur,
  onListInput,
  stepYear,
  openDatePicker,
} = inject('cardView');
</script>

<style scoped>
.card-view__label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.card-view__editor {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-50);
  border: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-base) var(--border-radius-base) 0.625rem 0.625rem;
  background: var(--background-color-interactive);
}

.card-view__editor-fields {
  display: flex;
  flex: 1 0 0;
  flex-direction: column;
  gap: var(--spacing-50);
}

.card-view__editor-field {
  margin-top: 0;
}

.card-view__editor-actions {
  display: flex;
  gap: var(--spacing-50);
}

.card-view__button {
  flex: 1 0 0;
}

.card-view__error {
  margin-top: var(--spacing-25);
}

.card-view__lookup :deep(.cdx-text-input),
.card-view__select :deep(.cdx-select-vue__handle) {
  min-width: 0;
}

.card-view__select :deep(.cdx-select-vue__indicator) {
  right: var(--spacing-50);
  width: 1.25rem;
  height: 1.25rem;
}

.card-view__chips {
  min-width: 0;
  max-width: 100%;
}

.card-view__chips :deep(.cdx-chip-input__chips) {
  align-content: center;
  gap: var(--spacing-50) var(--spacing-25);
  min-width: 0;
  padding: var(--spacing-25);
}

.card-view__chips :deep(.cdx-chip-input__input) {
  flex: 1 1 0;
  min-width: 0;
  padding-inline: 0;
  text-overflow: ellipsis;
}

.card-view__chips :deep(.cdx-chip-input) {
  min-width: 0;
}

.card-view__chips :deep(.cdx-chip-input__input:not(:placeholder-shown)) {
  flex: 1 0 auto;
  max-width: 100%;
  field-sizing: content;
}

.card-view__chips :deep(.cdx-chip-input__input:only-child) {
  padding-inline-start: var(--spacing-25);
}

.card-view__date,
.card-view__precision {
  display: flex;
  gap: var(--spacing-50);
}

.card-view__date {
  flex-direction: column;
}

.card-view__precision {
  flex-wrap: wrap;
  align-items: center;
}

.card-view__precision-label {
  flex: 1 0 100%;
  color: var(--color-base);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
}

.card-view__date-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.card-view__input-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.card-view__input-group {
  display: flex;
}

.card-view__control {
  flex: 1 1 0;
  min-width: 0;
}

.card-view__control:focus-within,
.card-view__step:focus-visible {
  z-index: 1;
}

.card-view__control :deep(.cdx-text-input__input) {
  border-start-end-radius: var(--border-radius-sharp);
  border-end-end-radius: var(--border-radius-sharp);
}

.card-view__year :deep(.cdx-text-input__input) {
  appearance: textfield;
}

.card-view__year :deep(.cdx-text-input__input::-webkit-inner-spin-button),
.card-view__year :deep(.cdx-text-input__input::-webkit-outer-spin-button) {
  appearance: none;
  margin: 0;
}

.card-view__day {
  pointer-events: none;
}

.card-view__step {
  position: relative;
  margin-inline-start: calc(var(--border-width-base) * -1);
  border-radius: var(--border-radius-sharp);
}

.card-view__step:last-child {
  border-start-end-radius: var(--border-radius-base);
  border-end-end-radius: var(--border-radius-base);
}
</style>