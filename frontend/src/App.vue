<template>
  <AppHeader
    v-if="showChrome"
    :authenticated="status === 'authenticated'"
    :username="username"
    @login="handleLogin"
    @logout="handleLogout"
  />
  <main :key="locale">
    <LogoutView v-if="logoutStage" :done="logoutStage === 'done'" @done="logoutStage = null" />

    <template v-else>
      <LoadingView v-if="isLoading" />

      <LandingView
        v-if="status === 'anonymous'"
        :login-failed="loginFailed"
        @login="handleLogin"
        @dismiss-error="loginFailed = false"
      />

      <template v-else-if="status === 'authenticated'">
        <HomeView
          v-if="view === 'home'"
          v-show="homeReady"
          @logout="handleLogout"
          @start="openCard"
          @ready="homeReady = true"
        />
        <CardView v-else :category="selectedCategory" :region="selectedRegion" @home="view = 'home'" />
      </template>
    </template>
  </main>
  <AppFooter v-if="showChrome" />
  <cdx-toast
    v-if="languageToast"
    :key="languageToast.id"
    type="success"
    :auto-dismiss="true"
    prevent-user-dismiss
    @auto-dismissed="languageToast = null"
  >
    {{ $i18n('settings-language-changed', languageToast.autonym) }}
  </cdx-toast>
  <cdx-toast-container />
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { CdxToast, CdxToastContainer } from '@wikimedia/codex';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import LandingView from './views/LandingView.vue';
import LoadingView from './views/LoadingView.vue';
import HomeView from './views/HomeView.vue';
import CardView from './views/CardView.vue';
import LogoutView from './views/LogoutView.vue';
import { LANGUAGES, locale } from './locale';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';
const AUTH_ERROR_PARAM = 'auth_error';

function consumeLoginError() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(AUTH_ERROR_PARAM)) return false;

  url.searchParams.delete(AUTH_ERROR_PARAM);
  window.history.replaceState(window.history.state, '', url);
  return true;
}

const status = ref('loading');
const username = ref('');
const view = ref('home');
const selectedCategory = ref('');
const selectedRegion = ref('all');
const homeReady = ref(false);
const logoutStage = ref(null);
const loginFailed = ref(consumeLoginError());
const languageToast = ref(null);
let languageToastId = 0;

watch(locale, (code) => {
  loginFailed.value = false;
  languageToast.value = {
    id: ++languageToastId,
    autonym: LANGUAGES.find((language) => language.code === code)?.autonym ?? code,
  };
});

const isLoading = computed(
  () => status.value === 'loading' || (status.value === 'authenticated' && !homeReady.value)
);
const showChrome = computed(
  () => view.value === 'home' && !isLoading.value && !logoutStage.value
);

function openCard({ category, region }) {
  selectedCategory.value = category;
  selectedRegion.value = region;
  view.value = 'card';
}

function handleLogin() {
  loginFailed.value = false;
  window.location.href = `${API_URL}/auth/login`;
}

async function handleLogout() {
  logoutStage.value = 'progress';

  try {
    const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error(`Logout failed with status ${res.status}`);

    username.value = '';
    view.value = 'home';
    status.value = 'anonymous';
    logoutStage.value = 'done';
  } catch (err) {
    console.error('[Qlaris] Unable to log out:', err);
    logoutStage.value = null;
  }
}

async function loadSession() {
  try {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      status.value = 'anonymous';
      return;
    }
    const { user } = await res.json();
    username.value = user.username;
    status.value = 'authenticated';
    loginFailed.value = false;
  } catch (err) {
    console.error('[Qlaris] Unable to connect to server:', err);
    status.value = 'anonymous';
  }
}

onMounted(loadSession);
</script>