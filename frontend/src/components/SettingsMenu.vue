<template>
  <div
    :class="[
      'settings-menu',
      {
        'settings-menu--authenticated': authenticated,
      },
    ]"
  >
    <cdx-menu-button
      v-model:selected="selectedItem"
      :menu-items="menuEntries"
      :aria-label="$i18n('settings-menu-label-aria')"
    >
      <cdx-icon :icon="cdxIconUserAvatarOutline" />
    </cdx-menu-button>

    <cdx-dialog
      v-model:open="showThemeDialog"
      :title="$i18n('settings-theme-label')"
      :use-close-button="true"
      :close-button-label="$i18n('cdx-dialog-close-button-label')"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: !hasThemeChanged,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveTheme"
      @default="showThemeDialog = false"
    >
      <div class="settings-dialog__body">
        <cdx-field
          :label="$i18n('settings-theme-label')"
          :hide-label="true"
          :is-fieldset="true"
        >
          <cdx-radio
            v-for="theme in THEMES"
            :key="theme"
            v-model="draftTheme"
            name="theme"
            :input-value="theme"
          >
            {{ $i18n(`settings-theme-${theme}`) }}

            <template
              v-if="theme === 'auto'"
              #description
            >
              {{ $i18n('settings-theme-auto-description') }}
            </template>
          </cdx-radio>
        </cdx-field>
      </div>
    </cdx-dialog>

    <cdx-dialog
      v-model:open="showTextSizeDialog"
      :title="$i18n('settings-text-size-label')"
      :use-close-button="true"
      :close-button-label="$i18n('cdx-dialog-close-button-label')"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: !hasTextSizeChanged,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveTextSize"
      @default="showTextSizeDialog = false"
    >
      <div class="settings-dialog__body">
        <cdx-field
          :label="$i18n('settings-text-size-label')"
          :hide-label="true"
          :is-fieldset="true"
        >
          <cdx-radio
            v-for="size in TEXT_SIZES"
            :key="size"
            v-model="draftTextSize"
            name="text-size"
            :input-value="size"
            :aria-label="
              size === 'medium'
                ? $i18n('settings-text-size-medium-aria')
                : undefined
            "
          >
            {{ $i18n(`settings-text-size-${size}`) }}
          </cdx-radio>
        </cdx-field>
      </div>
    </cdx-dialog>

    <cdx-dialog
      v-model:open="showLanguageDialog"
      :title="$i18n('settings-language-label')"
      :fixed-height="true"
      :primary-action="{
        label: $i18n('settings-apply'),
        actionType: 'progressive',
        disabled: !hasLanguageChanged,
      }"
      :default-action="{
        label: $i18n('settings-cancel'),
      }"
      @primary="saveLanguage"
      @default="showLanguageDialog = false"
    >
      <template #header>
        <div class="settings-dialog__header-content">
          <cdx-text-input
            v-model="languageQuery"
            class="settings-dialog__search"
            :start-icon="cdxIconSearch"
            :clearable="true"
            :placeholder="$i18n('settings-language-search-placeholder')"
            :aria-label="$i18n('settings-language-search-placeholder')"
          />

          <cdx-button
            weight="quiet"
            :aria-label="$i18n('settings-close')"
            @click="showLanguageDialog = false"
          >
            <cdx-icon :icon="cdxIconClose" />
          </cdx-button>
        </div>
      </template>

      <div class="settings-dialog__body">
        <cdx-field
          :label="$i18n('settings-language-label')"
          :hide-label="true"
          :is-fieldset="true"
        >
          <cdx-radio
            v-for="language in filteredLanguages"
            :key="language.code"
            v-model="draftLanguage"
            name="language"
            :input-value="language.code"
          >
            {{ language.autonym }}
          </cdx-radio>
        </cdx-field>

        <div
          v-show="filteredLanguages.length === 0"
          class="no-results"
          role="status"
        >
          <p>
            {{ $i18n('settings-language-no-results') }}
            <br>
            {{ $i18n('settings-language-no-results-suggestion') }}
          </p>
        </div>
      </div>

      <template #footer-text>
        <span class="translate-help">
          {{ $i18n('settings-language-reload', APP_NAME) }}
          <br>
          {{ $i18n('settings-translate-help') }}

          <a
            :href="TRANSLATE_URL"
            target="_blank"
            rel="noopener"
            class="translate-link"
          >
            {{ $i18n('settings-translate-link', APP_NAME) }}</a>.
        </span>
      </template>
    </cdx-dialog>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
  CdxButton,
  CdxDialog,
  CdxField,
  CdxIcon,
  CdxMenuButton,
  CdxRadio,
  CdxTextInput,
} from '@wikimedia/codex';
import {
  cdxIconBright,
  cdxIconClose,
  cdxIconLanguage,
  cdxIconLogIn,
  cdxIconLogOut,
  cdxIconMoon,
  cdxIconSearch,
  cdxIconSearchCaseSensitive,
  cdxIconUniversalDesign,
  cdxIconUserAvatarOutline,
} from '@wikimedia/codex-icons';
import { LANGUAGES, locale as currentLanguage, setLocale, translate } from '../locale';
import { THEMES, resolvedTheme, setTheme, theme as currentTheme } from '../theme';
import { readStorage, writeStorage } from '../../utils/storage';

const props = defineProps({
  authenticated: {
    type: Boolean,
    default: false,
  },
  username: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['login', 'logout']);

const TEXT_SIZE_STORAGE_KEY = 'qlaris_text_size';
const TEXT_SIZES = ['small', 'medium', 'large', 'extra-large'];
const DEFAULT_TEXT_SIZE = 'medium';

const APP_NAME = 'Qlaris';
const TRANSLATE_URL = 'https://translatewiki.net/wiki/Translating:Qlaris';

const getInitialTextSize = () => {
  const storedSize = readStorage(TEXT_SIZE_STORAGE_KEY);
  return TEXT_SIZES.includes(storedSize) ? storedSize : DEFAULT_TEXT_SIZE;
};

const currentTextSize = ref(getInitialTextSize());
const selectedItem = ref(null);

const showThemeDialog = ref(false);
const showLanguageDialog = ref(false);
const showTextSizeDialog = ref(false);

const draftTheme = ref(currentTheme.value);
const draftLanguage = ref(currentLanguage.value);
const draftTextSize = ref(currentTextSize.value);

const languageQuery = ref('');

const SORTED_LANGUAGES = [...LANGUAGES].sort((a, b) =>
  a.autonym.localeCompare(b.autonym, undefined, { sensitivity: 'base' })
);

const filteredLanguages = computed(() => {
  const query = languageQuery.value.trim().toLowerCase();

  if (!query) {
    return SORTED_LANGUAGES;
  }

  return SORTED_LANGUAGES.filter(({ autonym, code }) =>
    autonym.toLowerCase().includes(query) ||
    code.toLowerCase().includes(query)
  );
});

const themeLabel = computed(
  () => translate(`settings-theme-${currentTheme.value}`)
);

const textSizeLabel = computed(
  () => translate(`settings-text-size-${currentTextSize.value}`)
);

const languageLabel = computed(
  () =>
    LANGUAGES.find(
      ({ code }) => code === currentLanguage.value
    )?.autonym ?? ''
);

const hasThemeChanged = computed(
  () => draftTheme.value !== currentTheme.value
);

const hasLanguageChanged = computed(
  () => draftLanguage.value !== currentLanguage.value
);

const hasTextSizeChanged = computed(
  () => draftTextSize.value !== currentTextSize.value
);

const userLabel = computed(
  () => props.username?.trim() || translate('settings-user-label')
);

const authItem = computed(() => ({
  value: 'auth',
  label: translate(
    props.authenticated ? 'settings-logout' : 'landing-login'
  ),
  icon: props.authenticated ? cdxIconLogOut : cdxIconLogIn,
}));

const themeItem = computed(() => ({
  value: 'theme',
  label: translate('settings-theme-label'),
  description: themeLabel.value,
  icon:
    resolvedTheme.value === 'dark'
      ? cdxIconMoon
      : cdxIconBright,
}));

const languageItem = computed(() => ({
  value: 'language',
  label: translate('settings-language-label'),
  description: languageLabel.value,
  icon: cdxIconLanguage,
}));

const textSizeItem = computed(() => ({
  value: 'textSize',
  label: translate('settings-text-size-label'),
  description: textSizeLabel.value,
  icon: cdxIconSearchCaseSensitive,
}));

const accessibilityItem = computed(() => ({
  value: 'accessibility',
  label: translate('settings-accessibility-label'),
  icon: cdxIconUniversalDesign,
}));

// Logged out: Login, Theme, Display language
// Logged in: User submenu, Theme, Display language, Text size, Logout
const menuEntries = computed(() => {
  const preferences = [
    themeItem.value,
    languageItem.value,
  ];

  if (props.authenticated) {
    preferences.push(textSizeItem.value, accessibilityItem.value);
  }

  return props.authenticated
    ? [
        {
          label: userLabel.value,
          icon: cdxIconUserAvatarOutline,
          items: preferences,
        },
        authItem.value,
      ]
    : [
        authItem.value,
        ...preferences,
      ];
});

const openThemeDialog = () => {
  draftTheme.value = currentTheme.value;
  showThemeDialog.value = true;
};

const openLanguageDialog = () => {
  languageQuery.value = '';
  draftLanguage.value = currentLanguage.value;
  showLanguageDialog.value = true;
};

const openTextSizeDialog = () => {
  draftTextSize.value = currentTextSize.value;
  showTextSizeDialog.value = true;
};

const menuActions = {
  auth: () => {
    emit(props.authenticated ? 'logout' : 'login');
  },
  theme: openThemeDialog,
  language: openLanguageDialog,
  textSize: openTextSizeDialog,
};

watch(selectedItem, (value) => {
  if (!value) {
    return;
  }

  selectedItem.value = null;
  menuActions[value]?.();
});

watch(
  currentTextSize,
  (size) => document.documentElement.setAttribute('font-size', size),
  { immediate: true }
);

const saveTheme = () => {
  setTheme(draftTheme.value);
  showThemeDialog.value = false;
};

const saveTextSize = () => {
  currentTextSize.value = draftTextSize.value;
  writeStorage(TEXT_SIZE_STORAGE_KEY, currentTextSize.value);
  showTextSizeDialog.value = false;
};

const saveLanguage = () => {
  setLocale(draftLanguage.value);
  showLanguageDialog.value = false;
};
</script>

<style scoped>
.settings-menu {
  display: flex;
  align-items: center;
}

/* Unauthenticated menu */
.settings-menu:not(.settings-menu--authenticated)
  :deep(.cdx-menu-item:first-child) {
  border-bottom: var(--border-width-base) solid var(--border-color-base);
}

/* Authenticated menu */
.settings-menu--authenticated
  :deep(.cdx-menu__group__meta) {
  align-items: flex-start;
  padding: var(--spacing-50) var(--spacing-75);
  border-bottom: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--border-radius-sharp);
}

.settings-menu--authenticated
  :deep(.cdx-menu__group-wrapper + .cdx-menu-item) {
  border-top: var(--border-width-base) solid var(--border-color-base);
  border-radius: var(--border-radius-sharp);
}

.settings-menu--authenticated
  :deep(.cdx-menu__group__icon) {
  flex-shrink: 0;
  height: var(--size-icon-medium);
}

.settings-menu--authenticated
  :deep(.cdx-menu__group__label) {
  color: var(--color-base);
  overflow-wrap: anywhere;
}

.settings-dialog__header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}

.settings-dialog__search {
  flex: 1 1 auto;
  min-width: 0;
}

.settings-dialog__header-content .cdx-button {
  margin-inline-end: calc(var(--spacing-50) * -1);
}

.settings-dialog__body :deep(.cdx-radio__label),
.no-results {
  font-family: var(--font-family-system-sans);
}

.no-results {
  color: var(--color-subtle);
  line-height: var(--line-height-small);
}

.translate-link {
  color: var(--color-progressive);
  text-decoration: none;
}
</style>