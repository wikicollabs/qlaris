<template>
  <cdx-button class="region-selector" @click="openRegionDialog">
    <cdx-icon :icon="cdxIconGlobe" />
    <span class="region-selector__label">{{ regionLabel }}</span>
    <cdx-icon :icon="cdxIconNext" />
  </cdx-button>

  <cdx-dialog
    v-model:open="showRegionDialog"
    :fixed-height="true"
    :primary-action="{
      label: $i18n('settings-apply'),
      actionType: 'progressive',
      disabled: !hasRegionChanged,
    }"
    :default-action="{
      label: $i18n('settings-cancel'),
    }"
    @primary="saveRegion"
    @default="showRegionDialog = false"
  >
    <template #header>
      <div class="region-dialog__header-content">
        <cdx-text-input
          v-model="regionSearchQuery"
          class="region-dialog__search"
          :start-icon="cdxIconSearch"
          :clearable="true"
          :placeholder="$i18n('settings-region-search-placeholder')"
          :aria-label="regionSearchQuery || $i18n('settings-region-search-placeholder')"
        />

        <cdx-button
          weight="quiet"
          :aria-label="$i18n('settings-close')"
          @click="showRegionDialog = false"
        >
          <cdx-icon :icon="cdxIconClose" />
        </cdx-button>
      </div>
    </template>

    <div class="region-dialog__body">
      <div class="region-dialog__scroll-content">
        <cdx-field
          :label="$i18n('settings-region-label')"
          :hide-label="true"
          :is-fieldset="true"
        >
          <cdx-radio
            v-for="region in filteredRegions"
            :key="region.value"
            v-model="tempRegion"
            name="region"
            :input-value="region.value"
            :aria-label="region.label"
          >
            {{ region.label }}
          </cdx-radio>
        </cdx-field>

        <div
          v-show="filteredRegions.length === 0"
          class="no-results"
        >
          <p>
            {{ $i18n('settings-region-no-results') }}
            <br>
            {{ $i18n('settings-region-no-results-suggestion') }}
          </p>
        </div>
      </div>
    </div>
  </cdx-dialog>
</template>

<script setup>
import { computed, onMounted, ref, shallowRef } from 'vue';
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxRadio,
  CdxTextInput,
} from '@wikimedia/codex';
import { cdxIconClose, cdxIconGlobe, cdxIconNext, cdxIconSearch } from '@wikimedia/codex-icons';
import { fetchScopeOptions } from '../services/fetchScopeOptions';
import { translate } from '../locale';

const GEOGRAPHIC_SCOPE_ID = 'geographicScope';
const ALL_REGIONS = 'all';

const emit = defineEmits(['ready', 'update:region']);

const locale = document.documentElement.lang || 'en';

const normalize = (text) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase(locale).trim();

const toRegion = ({ value, label }) => ({ value, label, searchKey: normalize(label) });

const ALL_REGION = toRegion({ value: ALL_REGIONS, label: translate('settings-region-all') });
const regionOptions = shallowRef([]);
const regions = computed(() => [ALL_REGION, ...regionOptions.value]);

const currentRegion = ref(ALL_REGIONS);
const tempRegion = ref(currentRegion.value);
const showRegionDialog = ref(false);
const regionSearchQuery = ref('');

const regionLabel = computed(
  () => regions.value.find((region) => region.value === currentRegion.value)?.label ?? ALL_REGION.label
);

const filteredRegions = computed(() => {
  const query = normalize(regionSearchQuery.value);
  if (!query) return regions.value;

  return regions.value.filter((region) => region.searchKey.includes(query));
});

const hasRegionChanged = computed(() => tempRegion.value !== currentRegion.value);

onMounted(async () => {
  try {
    regionOptions.value = (await fetchScopeOptions(GEOGRAPHIC_SCOPE_ID, locale)).map(toRegion);
  } finally {
    emit('ready');
  }
});

const openRegionDialog = () => {
  regionSearchQuery.value = '';
  tempRegion.value = currentRegion.value;
  showRegionDialog.value = true;
};

const saveRegion = () => {
  currentRegion.value = tempRegion.value;
  emit('update:region', currentRegion.value);
  showRegionDialog.value = false;
};
</script>

<style scoped>
.region-selector {
  gap: var(--spacing-25);
  padding: var(--spacing-25) var(--spacing-50);
}

.region-selector__label {
  flex: 1 0 0;
  color: var(--color-base);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  text-align: left;
}

.region-dialog__header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  width: 100%;
}

.region-dialog__search {
  flex: 1 1 auto;
  min-width: 0;
}

.region-dialog__body :deep(.cdx-radio__label) {
  font-family: var(--font-family-system-sans);
}

.region-dialog__header-content .cdx-button {
  margin-inline-end: calc(var(--spacing-50) * -1);
}

.no-results {
  color: var(--color-subtle);
  line-height: var(--line-height-small);
  font-family: var(--font-family-system-sans);
}
</style>