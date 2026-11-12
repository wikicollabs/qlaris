<template>
  <div
    ref="wrapperRef"
    class="cdx-select-with-search"
    :class="{
      'cdx-select-with-search--disabled': disabled,
      'cdx-select-with-search--error': visualStatus === 'error',
      'cdx-select-with-search--expanded': isExpanded,
      'cdx-select-with-search--flipped': isFlippedAbove,
    }"
    @focusin="isFocused = true"
    @focusout="onFocusOut"
  >
    <div class="cdx-select-with-search__trigger-stack">
      <cdx-select
        :selected="selected"
        :menu-items="[]"
        :disabled="disabled"
        :default-label="defaultLabel"
        :status="visualStatus"
        class="cdx-select-with-search__visual"
        aria-hidden="true"
        tabindex="-1"
        inert
      >
        <template #label>
          <span
            class="cdx-select-with-search__label"
            :class="{
              'cdx-select-with-search__label--placeholder': !selectedLabel,
            }"
          >
            {{ selectedLabel || defaultLabel }}
          </span>
        </template>
      </cdx-select>

      <button
        ref="handleRef"
        type="button"
        class="cdx-select-with-search__overlay-handle"
        role="combobox"
        :disabled="disabled"
        :aria-expanded="isExpanded"
        :aria-controls="menuId"
        :aria-label="ariaLabel"
        :aria-invalid="status === 'error' || undefined"
        @click="toggleExpanded"
        @keydown="onHandleKeydown"
      />
    </div>

    <div
      ref="menuEl"
      popover="auto"
      class="cdx-select-with-search__menu"
      :class="{
        'cdx-select-with-search__menu--flipped': isFlippedAbove,
      }"
      :style="{ ...floatingStyles, visibility: menuVisibility }"
      @toggle="onMenuToggle"
    >
      <div class="cdx-select-with-search__search-wrapper">
        <cdx-text-input
          ref="searchInputRef"
          v-model="searchQuery"
          class="cdx-select-with-search__search-input"
          input-type="search"
          :start-icon="cdxIconSearch"
          :clearable="true"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
          role="combobox"
          :aria-expanded="isExpanded"
          :aria-controls="menuId"
          :aria-activedescendant="activeDescendantId"
          aria-autocomplete="list"
          @keydown="onSearchKeydown"
        />
      </div>

      <cdx-menu
        :id="menuId"
        ref="menuRef"
        :selected="selected"
        :menu-items="filteredMenuItems"
        :expanded="isExpanded"
        :visible-item-limit="5"
        :render-in-place="true"
        @update:selected="onSelect"
      >
        <template #no-results>
          {{ noResultsText }}
        </template>
      </cdx-menu>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';
import { CdxMenu, CdxSelect, CdxTextInput } from '@wikimedia/codex';
import { cdxIconSearch } from '@wikimedia/codex-icons';
import { autoUpdate, flip, hide, size, useFloating } from '@floating-ui/vue';

const props = defineProps({
  menuItems: {
    type: Array,
    default: () => [],
  },
  selected: {
    type: [String, Number],
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  defaultLabel: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'default',
  },
  searchPlaceholder: {
    type: String,
    default: 'Search',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  noResultsText: {
    type: String,
    default: 'No results found.',
  },
});

const emit = defineEmits(['update:selected', 'blur', 'focus']);

const wrapperRef = ref(null);
const handleRef = ref(null);
const menuEl = ref(null);
const searchInputRef = ref(null);
const menuRef = ref(null);

const isExpanded = ref(false);
const isFocused = ref(false);
const searchQuery = ref('');
const menuId = useId();

let stopAutoUpdate = null;

const visualStatus = computed(() =>
  isExpanded.value || isFocused.value
    ? 'default'
    : props.status
);

const selectedLabel = computed(() => {
  const selectedItem = props.menuItems.find(
    (item) => item.value === props.selected
  );

  return selectedItem
    ? selectedItem.label ?? String(selectedItem.value)
    : '';
});

const filteredMenuItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  if (!query) {
    return props.menuItems;
  }

  return props.menuItems.filter((item) =>
    (item.label ?? String(item.value)).toLowerCase().includes(query)
  );
});

const activeDescendantId = computed(() =>
  menuRef.value?.getHighlightedMenuItem?.()?.id ?? null
);

const {
  floatingStyles,
  placement,
  middlewareData,
  update: updateMenuPosition,
} = useFloating(handleRef, menuEl, {
  placement: 'bottom',
  middleware: [
    size({
      padding: 8,
      apply({ availableHeight, elements, rects }) {
        elements.floating.style.width =
          `${rects.reference.width}px`;

        elements.floating.style.maxHeight =
          `${availableHeight}px`;
      },
    }),
    flip({ padding: 7 }),
    {
      ...hide({
        strategy: 'escaped',
        rootBoundary: 'layoutViewport',
      }),
      name: 'hideEscaped',
    },
    {
      ...hide({
        padding: 8,
        rootBoundary: 'layoutViewport',
      }),
      name: 'hideReference',
    },
  ],
});

const isFlippedAbove = computed(() =>
  placement.value.startsWith('top')
);

const menuVisibility = computed(() => {
  const hideData = middlewareData.value;

  return (
    hideData.hideEscaped?.escaped ||
    hideData.hideReference?.referenceHidden
  )
    ? 'hidden'
    : 'visible';
});

function startAutoUpdate() {
  if (stopAutoUpdate || !handleRef.value || !menuEl.value) {
    return;
  }

  stopAutoUpdate = autoUpdate(
    handleRef.value,
    menuEl.value,
    updateMenuPosition
  );
}

function stopMenuAutoUpdate() {
  stopAutoUpdate?.();
  stopAutoUpdate = null;
}

function onMenuToggle(event) {
  isExpanded.value = event.newState === 'open';

  if (isExpanded.value) {
    startAutoUpdate();
    return;
  }

  stopMenuAutoUpdate();
}

function openMenu() {
  if (props.disabled || isExpanded.value || !menuEl.value) {
    return;
  }

  searchQuery.value = '';
  menuEl.value.showPopover();
  isExpanded.value = true;

  updateMenuPosition();
  startAutoUpdate();

  emit('focus');

  nextTick(() => {
    searchInputRef.value?.focus?.();
  });
}

function closeMenu({ refocusHandle = false } = {}) {
  const menu = menuEl.value;

  if (!menu || !isExpanded.value) {
    return;
  }

  menu.hidePopover();
  isExpanded.value = false;
  searchQuery.value = '';
  stopMenuAutoUpdate();

  if (refocusHandle) {
    nextTick(() => {
      handleRef.value?.focus();
    });
  }
}

function toggleExpanded() {
  if (props.disabled) {
    return;
  }

  if (isExpanded.value) {
    closeMenu();
    return;
  }

  openMenu();
}

function onSelect(value) {
  emit('update:selected', value);
  closeMenu({ refocusHandle: true });
}

function onHandleKeydown(event) {
  const openingKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' '];

  if (openingKeys.includes(event.key)) {
    event.preventDefault();

    if (!isExpanded.value) {
      openMenu();
    }

    return;
  }

  if (event.key === 'Escape' && isExpanded.value) {
    closeMenu({ refocusHandle: true });
  }
}

function onSearchKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu({ refocusHandle: true });
    return;
  }

  if ([' ', 'Home', 'End'].includes(event.key)) {
    return;
  }

  menuRef.value?.delegateKeyNavigation?.(event);
}

function onFocusOut(event) {
  const nextFocusedElement = event.relatedTarget;

  if (
    nextFocusedElement instanceof Node &&
    wrapperRef.value?.contains(nextFocusedElement)
  ) {
    return;
  }

  isFocused.value = false;
  emit('blur');
}

onBeforeUnmount(() => {
  stopMenuAutoUpdate();
});
</script>

<style scoped>
.cdx-select-with-search {
  position: relative;
  width: 100%;
  min-width: 0;
}

.cdx-select-with-search__trigger-stack {
  position: relative;
}

.cdx-select-with-search__visual {
  display: block;
}

.cdx-select-with-search__visual :deep(.cdx-select-vue__handle) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cdx-select-with-search__visual :deep(.cdx-select-vue__indicator) {
  right: var(--spacing-50);
  width: 1.25rem;
  height: 1.25rem;
}

.cdx-select-with-search--expanded:not(
  .cdx-select-with-search--flipped
) .cdx-select-with-search__visual :deep(.cdx-select-vue__handle) {
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.cdx-select-with-search--expanded.cdx-select-with-search--flipped
  .cdx-select-with-search__visual :deep(.cdx-select-vue__handle) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.cdx-select-with-search__overlay-handle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
}

.cdx-select-with-search--disabled
  .cdx-select-with-search__overlay-handle {
  cursor: not-allowed;
}

.cdx-select-with-search--expanded
  .cdx-select-with-search__overlay-handle,
.cdx-select-with-search__overlay-handle:focus:not(:active) {
  border-width: var(--border-width-base);
  border-style: var(--border-style-base);
  border-color: var(--border-color-progressive--focus);
  box-shadow:
    var(--box-shadow-inset-small)
    var(--box-shadow-color-progressive--focus);
  outline: var(--outline-base--focus);
  border-radius: var(--border-radius-base);
}

.cdx-select-with-search--expanded:not(
  .cdx-select-with-search--flipped
) .cdx-select-with-search__overlay-handle {
  border-bottom: none;
}

.cdx-select-with-search--expanded.cdx-select-with-search--flipped
  .cdx-select-with-search__overlay-handle {
  border-top: none;
}

.cdx-select-with-search__label {
  color: var(--color-base);
}

.cdx-select-with-search__label--placeholder {
  color: var(--color-placeholder);
}

.cdx-select-with-search--disabled
  .cdx-select-with-search__label {
  color: var(--color-disabled);
}

.cdx-select-with-search--error
  .cdx-select-with-search__label--placeholder {
  color: var(--color-error);
}

.cdx-select-with-search__menu {
  inset: unset;
  margin: 0;
  padding: 0;
  background-color: var(--background-color-base);
  border: var(--border-width-base) var(--border-style-base)
    var(--border-color-base);
  border-radius:
    var(--border-radius-sharp)
    var(--border-radius-sharp)
    var(--border-radius-base)
    var(--border-radius-base);
  box-shadow:
    0 0.25rem 0.25rem 0 var(--box-shadow-color-alpha-base),
    0 0 0.5rem 0 var(--box-shadow-color-alpha-base);
  overflow: hidden;
}

.cdx-select-with-search__menu:popover-open {
  display: flex;
  flex-direction: column;
}

.cdx-select-with-search__menu--flipped {
  border-radius:
    var(--border-radius-base)
    var(--border-radius-base)
    var(--border-radius-sharp)
    var(--border-radius-sharp);
}

.cdx-select-with-search__search-wrapper {
  display: flex;
  align-items: flex-start;
  padding: var(--spacing-50) var(--spacing-75);
  border-bottom: var(--border-width-base) var(--border-style-base)
    var(--border-color-subtle);
}

.cdx-select-with-search__search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.cdx-select-with-search__menu :deep(.cdx-menu) {
  position: static;
  border: none;
  box-shadow: none;
  background: none;
  border-radius: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
</style>