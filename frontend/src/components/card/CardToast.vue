<template>
  <cdx-toast
    v-if="toast"
    :key="toast.id"
    standalone
    type="notice"
    prevent-user-dismiss
    :auto-dismiss="TOAST_DURATION"
    :action-button-label="$i18n('card-undo')"
    @action-button-click="undo"
    @auto-dismissed="dismissToast(toast.id)"
  >
    {{ toast.text }}
  </cdx-toast>
</template>

<script setup>
import { inject } from 'vue';
import { CdxToast } from '@wikimedia/codex';

const { TOAST_DURATION, toast, undo, dismissToast } = inject('cardView');
</script>