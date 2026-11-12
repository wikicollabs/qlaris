<template>
  <section class="logout-view">
    <cdx-icon v-if="done" class="logout-view__icon" :icon="cdxIconSuccess" />
    <h4 class="logout-view__title">
      {{ done ? $i18n('logout-success') : $i18n('logout-in-progress') }}
    </h4>
    <cdx-progress-bar v-if="!done" :aria-label="$i18n('logout-in-progress')" />
    <cdx-button
      v-else
      class="logout-view__button"
      action="progressive"
      weight="primary"
      size="large"
      @click="$emit('done')"
    >
      {{ $i18n('logout-ok') }}
    </cdx-button>
  </section>
</template>

<script setup>
import { CdxButton, CdxIcon, CdxProgressBar } from '@wikimedia/codex';
import { cdxIconSuccess } from '@wikimedia/codex-icons';

defineProps({
  done: { type: Boolean, default: false },
});

defineEmits(['done']);
</script>

<style scoped>
.logout-view {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  align-self: center;
  gap: var(--spacing-100);
  width: 20rem;
  max-width: 100%;
  padding: var(--spacing-100);
}

.logout-view__icon {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  color: var(--color-success);
}

.logout-view__title {
  align-self: stretch;
  margin: 0;
  color: var(--color-emphasized);
  font-family: var(--font-family-base);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
  text-align: center;
}

.logout-view :deep(.cdx-progress-bar) {
  align-self: stretch;
}

.logout-view__button {
  align-self: stretch;
  padding: var(--spacing-6) var(--spacing-100);
}

/* LOGOUT VIEW - TABLE POTRAIT & DESKTOP */
@media (min-width: 640px) {
  .logout-view {
    align-self: stretch;
    width: auto;
    padding: var(--spacing-200);
  }

  .logout-view :deep(.cdx-progress-bar) {
    align-self: center;
    width: 100%;
    max-width: var(--size-3200);
    height: var(--size-75);
  }

  .logout-view__button {
    align-self: center;
    width: 100%;
    max-width: var(--size-2800);
    height: var(--size-275);
  }
}
</style>