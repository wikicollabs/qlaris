import { computed, ref, watchEffect } from 'vue';
import { readStorage, writeStorage } from '../utils/storage';

const STORAGE_KEY = 'theme';
const FALLBACK_THEME = 'auto';
const DAY_CLASS = 'skin-theme-clientpref-day';
const NIGHT_CLASS = 'skin-theme-clientpref-night';
const LEGACY_CLASS = 'skin-theme-clientpref-os';

export const THEMES = ['auto', 'light', 'dark'];

const detectTheme = () => {
  const stored = readStorage(STORAGE_KEY);
  return THEMES.includes(stored) ? stored : FALLBACK_THEME;
};

const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
const systemDark = ref(systemQuery.matches);

systemQuery.addEventListener('change', (event) => {
  systemDark.value = event.matches;
});

export const theme = ref(detectTheme());

export const resolvedTheme = computed(() => {
  if (theme.value !== 'auto') return theme.value;
  return systemDark.value ? 'dark' : 'light';
});

watchEffect(
  () => {
    const isDark = resolvedTheme.value === 'dark';
    const root = document.documentElement;

    root.classList.remove(LEGACY_CLASS);
    root.classList.toggle(NIGHT_CLASS, isDark);
    root.classList.toggle(DAY_CLASS, !isDark);
  },
  { flush: 'sync' }
);

export const setTheme = (value) => {
  if (!THEMES.includes(value) || value === theme.value) return;

  theme.value = value;
  writeStorage(STORAGE_KEY, value);
};