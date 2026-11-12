<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 250 250"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    :aria-label="label"
  >
    <rect width="250" height="250" fill="#EAECF0" />
    <path
      d="M176.2 163.4C176.2 174.004 167.604 182.6 157 182.6C146.396 182.6 137.8 174.004 137.8 163.4C137.8 152.796 146.396 144.2 157 144.2C159.246 144.2 161.396 144.603 163.4 145.312V92.9999H105.8V163.4C105.8 174.004 97.2038 182.6 86.5999 182.6C75.996 182.6 67.3999 174.004 67.3999 163.4C67.3999 152.796 75.996 144.2 86.5999 144.2C88.8463 144.2 90.9963 144.603 92.9999 145.312V67.3999H176.2V163.4Z"
      fill="#72777D"
    />
  </svg>
</template>

<script setup>
import { translate } from '../locale';

defineProps({
  size: { type: [Number, String], default: 250 },
  label: { type: String, default: () => translate('card-cover-placeholder') },
});
</script>