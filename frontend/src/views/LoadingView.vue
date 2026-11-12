<template>
  <section class="loading-view">
    <span class="loading-view__logo" aria-hidden="true">
      <qlaris-icon class="loading-view__icon" />
    </span>
    <cdx-progress-bar />
  </section>
</template>

<script setup>
import { CdxProgressBar } from '@wikimedia/codex';
import QlarisIcon from '../assets/QlarisIcon.vue';
</script>

<style scoped>
.loading-view {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-100);
  padding: var(--spacing-100);
}

.loading-view__logo {
  display: block;
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  padding: 1.88px 0;
}

.loading-view__icon {
  display: block;
  width: 64px;
  height: 60.235px;
}

.loading-view :deep(.cdx-progress-bar) {
  align-self: stretch;
}

/* LOADING VIEW - TABLET PORTRAIT */
@media (min-width: 640px) {
  .loading-view {
    flex: 1 0 0;
    padding: var(--spacing-200);
  }

  .loading-view :deep(.cdx-progress-bar) {
    align-self: center;
    width: 100%;
    max-width: var(--size-3200);
    height: var(--size-75);
  }
}

/* LOADING VIEW - DESKTOP */
@media (min-width: 1024px) {
  .loading-view {
    min-height: 45rem;
  }

  .loading-view :deep(.cdx-progress-bar) {
    flex-shrink: 0;
  }
}
</style>