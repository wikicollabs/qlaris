<template>
  <section class="landing">
    <div class="landing__content">
      <div class="landing__info">
        <div class="landing__copy">
          <h1 class="landing__title">{{ $i18n('landing-title') }}</h1>
          <p class="landing__text">{{ $i18n('landing-subtitle') }}</p>
        </div>
        <cdx-button
          class="landing__login"
          action="progressive"
          weight="primary"
          size="large"
          @click="$emit('login')"
        >
          <cdx-icon :icon="cdxIconLogIn" />
          {{ $i18n('landing-login') }}
        </cdx-button>
      </div>
      <div class="landing__media">
        <landing-illustration />
      </div>
    </div>
    <cdx-toast v-if="loginFailed" type="error" prevent-user-dismiss>
      {{ $i18n('landing-login-error') }}<br>{{ $i18n('landing-login-error-suggestion') }}
    </cdx-toast>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { CdxButton, CdxIcon, CdxToast } from '@wikimedia/codex';
import { cdxIconLogIn } from '@wikimedia/codex-icons';
import LandingIllustration from '../assets/LandingIllustration.vue';

defineProps({
  loginFailed: { type: Boolean, default: false },
});

defineEmits(['login']);

const TOAST_SELECTOR = '.cdx-toast-container';

const blurToast = (element) => {
  if (element instanceof HTMLElement && element.closest(TOAST_SELECTOR)) element.blur();
};

const onFocusIn = (event) => blurToast(event.target);

const stopGuard = () => {
  document.removeEventListener('focusin', onFocusIn, true);
  document.removeEventListener('pointerdown', stopGuard, true);
  document.removeEventListener('keydown', stopGuard, true);
};

onMounted(() => {
  blurToast(document.activeElement);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('pointerdown', stopGuard, true);
  document.addEventListener('keydown', stopGuard, true);
});

onBeforeUnmount(stopGuard);
</script>

<style scoped>
.landing {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-100);
}

.landing__content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.landing__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-100);
}

.landing__copy {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: var(--spacing-50);
}

.landing__media {
  display: none;
}

.landing__title {
  margin: 0;
  text-align: start;
  color: var(--color-emphasized);
  font-family: var(--font-family-heading-main);
  font-size: var(--font-size-xxx-large);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-xxx-large);
}

.landing__text {
  margin: 0;
  text-align: start;
  color: var(--color-base);
  line-height: var(--line-height-medium);
}

.landing__login {
  gap: var(--spacing-25);
  width: 10rem;
  padding: var(--spacing-6) var(--spacing-100);
}

/* LANDING VIEW - TABLET POTRAIT & DESKTOP */
@media (min-width: 640px) {
  .landing {
    flex: 1 0 0;
    padding: var(--spacing-200);
  }

  .landing__content {
    flex-flow: row wrap;
    justify-content: center;
    align-items: center;
    align-content: center;
    gap: var(--spacing-150);
    max-width: var(--size-5600);
  }

  .landing__info {
    flex: 1 0 0;
    min-width: 18rem;
  }

  .landing__media {
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 22.5rem;
    height: 22.5rem;
    padding: 2.25rem;
  }

  .landing__login {
    height: var(--size-275);
    min-width: 10rem;
    max-width: var(--size-2800);
  }
}
</style>