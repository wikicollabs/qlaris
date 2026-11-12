<template>
  <header class="app-header">
    <div class="app-header__logo">
      <div class="app-header__brand">
        <qlaris-logo class="app-header__image" />
      </div>
    </div>

    <settings-menu
      :authenticated="authenticated"
      :username="username"
      @login="$emit('login')"
      @logout="$emit('logout')"
    />
  </header>
</template>

<script setup>
import SettingsMenu from './SettingsMenu.vue';
import QlarisLogo from '../assets/QlarisLogo.vue';

defineProps({
  authenticated: { type: Boolean, default: false },
  username: { type: String, default: '' },
});

defineEmits(['login', 'logout']);
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 3.375rem;
  padding: var(--spacing-50) var(--spacing-75) var(--spacing-50) var(--spacing-100);
}

.app-header__logo {
  display: flex;
  flex: 1 0 0;
}

.app-header__brand {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 101.5px;
  height: 36px;
  padding: 6px 0 3px;
}

.app-header__image {
  display: block;
  width: 101.502px;
  height: 27px;
}

/* APP HEADER - TABLET POTRAIT & DESKTOP */
@media (min-width: 640px) {
  .app-header {
    gap: 0.5rem;
    height: 4rem;
    padding: var(--spacing-75) var(--spacing-200);
  }
}
</style>