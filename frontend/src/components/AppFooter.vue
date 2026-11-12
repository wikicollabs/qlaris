<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="footer-branding">
        <div class="footer-logo">
          <qlaris-icon class="footer-logo__icon" />
        </div>
        <div class="footer-text">
          <h3 class="footer-title">{{ appName }}</h3>
          <p class="footer-caption">
            {{ $i18n('footer-by') }}
            <a
              class="footer-link"
              href="https://meta.wikimedia.org/wiki/Wikicollabs"
              target="_blank"
              rel="noopener"
              :aria-label="$i18n('footer-wikicollabs-aria', 'Wikicollabs')"
            >
              Wikicollabs
            </a>
          </p>
          <p class="footer-caption">
            {{ $i18n('footer-powered-by') }}
          </p>
        </div>
      </div>

      <nav class="links">
        <template v-for="(link, index) in links" :key="link.href">
          <span v-if="index" class="link-separator" aria-hidden="true">·</span>
          <a
            class="footer-link external-link"
            :href="link.href"
            target="_blank"
            rel="noopener"
            :aria-label="$i18n(link.aria)"
          >
            {{ $i18n(link.label) }}
            <cdx-icon :icon="cdxIconLinkExternal" size="small" />
          </a>
        </template>
      </nav>
    </div>
  </footer>
</template>

<script setup>
import { CdxIcon } from '@wikimedia/codex';
import { cdxIconLinkExternal } from '@wikimedia/codex-icons';
import QlarisIcon from '../assets/QlarisIcon.vue';

const appName = 'Qlaris';

const links = [
  {
    href: 'https://www.wikidata.org/wiki/Wikidata:Qlaris',
    label: 'footer-about',
    aria: 'footer-about-aria'
  },
  {
    href: 'https://www.wikidata.org/wiki/Wikidata:Qlaris/Privacy_policy',
    label: 'footer-privacy-policy',
    aria: 'footer-privacy-policy-aria'
  },
  {
    href: 'https://www.wikidata.org/wiki/Wikidata:Qlaris/License',
    label: 'footer-license',
    aria: 'footer-license-aria'
  },
  {
    href: 'https://www.wikidata.org/wiki/Special:RecentChanges',
    label: 'footer-recent-changes',
    aria: 'footer-recent-changes-aria'
  },
  {
    href: 'https://github.com/wikicollabs/qlaris',
    label: 'footer-source',
    aria: 'footer-source-code-aria'
  }
];
</script>

<style scoped>
.app-footer {
  border-top: var(--border-width-base) solid var(--border-color-base);
  background-color: var(--background-color-neutral);
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150);
  padding: var(--spacing-100);
}

.footer-branding {
  display: flex;
  align-items: center;
  gap: var(--spacing-100);
}

.footer-logo {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 1.06px 0;
}

.footer-logo__icon {
  display: block;
  width: 36px;
  height: 33.882px;
}

.footer-text {
  flex: 1 0 0;
}

.footer-title {
  margin: 0;
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-large);
}

.footer-caption {
  margin: 0;
  color: var(--color-subtle);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-35) var(--spacing-25);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.footer-link {
  color: var(--color-progressive);
  text-decoration: none;
}

.footer-link:hover {
  text-decoration: underline;
}

.external-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.external-link :deep(.cdx-icon) {
  color: var(--color-progressive);
}

/* APP FOOTER - TABLET PORTRAIT & DESKTOP */
@media (min-width: 640px) {
  .footer-content {
    flex-direction: row;
    justify-content: center;
    align-items: flex-end;
    padding: var(--spacing-150) var(--spacing-200);
  }

  .footer-branding {
    width: 16rem;
  }

  .links {
    flex: 1 0 0;
    justify-content: flex-end;
    align-content: center;
  }
}
</style>