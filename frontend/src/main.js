import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css';
import '@wikimedia/codex/dist/codex.style.css';
import './style.css';
import App from './App.vue';
import './theme';
import './composables/UseAnimation.js';
import { i18n } from './locale';

createApp(App).use(createPinia()).use(i18n).mount('#app');