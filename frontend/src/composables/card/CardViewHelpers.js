import { nextTick } from 'vue';
import { animateElement } from '../UseAnimation';
import {
  ENTITY_LABEL_ID_PATTERN,
  FIGMA_EASE_OUT,
  PREFILLED_VALUES,
  SKIP_DURATION,
  SKIP_OFFSET,
  SKIP_ROTATION,
  dateField,
  dateFormatters,
  fields,
  titleField,
} from './CardViewConfig';
import { findTitleLanguage } from '../../services/titleLanguages';

export const formatEntity = ({ label, id }) => `${label} (${id})`;

export const splitEntityLabel = (label) => {
  const match = label.match(ENTITY_LABEL_ID_PATTERN);
  return match ? { textPart: match[1], idPart: match[2] } : { textPart: label, idPart: '' };
};

export const fieldId = (property) => `card-field-${property}`;

const pad = (value, length = 2) => String(value).padStart(length, '0');

export const toIsoDate = (date) => `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const toDate = (year, month, day) => {
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, day);
  return date;
};

export const focusById = async (id) => {
  await nextTick();
  document.getElementById(id)?.focus();
};

const FOCUSABLE = 'input:not([readonly]):not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SELECT_HANDLE = '.cdx-select-vue__handle';

export const focusFirstControl = async (container = '.card-view__editor-fields') => {
  await nextTick();

  const control = document.querySelector(container)?.querySelector(FOCUSABLE);
  control?.focus({ preventScroll: true });

  if (control?.matches(SELECT_HANDLE)) control.click();
};

export const getValue = (values, field) => {
  if (field === titleField) return values.title;
  if (field === dateField) return values.date;
  return values.lists[field.property] ?? null;
};

export const getSignature = (field, value) => {
  if (field === titleField) return `${value.text}\n${value.language?.value ?? ''}`;
  if (field === dateField) return value.text;
  return value.chips.map(({ value: id }) => id).sort().join('\n');
};

export const toStatementValue = (value) => ({ text: value.text, caption: value.language?.label });

export const createSavedDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);

  return {
    text: dateFormatters.day.format(toDate(year, month, day)),
    precision: 'day',
    years: { year, month: year },
    month,
    date: iso,
  };
};

export const createSavedList = (field, values) => {
  const chips = values.map((value) => {
    const { label } = field.suggestions.find((suggestion) => suggestion.value === value);
    return { value, label };
  });

  return { chips, selected: [...values], text: chips.map(({ label }) => label).join(', ') };
};

export const createInitialValues = (number) => {
  const prefilled = PREFILLED_VALUES[number];

  return {
    title: prefilled?.title
      ? {
          text: prefilled.title.text,
          language: findTitleLanguage(prefilled.title.language),
        }
      : null,
    date: prefilled?.date ? createSavedDate(prefilled.date) : null,
    lists: Object.fromEntries(
      Object.entries(prefilled?.lists ?? {}).map(([property, values]) => [
        property,
        createSavedList(fields.find((field) => field.property === property), values),
      ])
    ),
  };
};

let scrollLocks = 0;
let restoreScroll = null;

export const lockScroll = () => {
  if (scrollLocks === 0) {
    const root = document.documentElement;
    const gutter = window.innerWidth - root.clientWidth;
    const previous = { overflow: root.style.overflow, paddingInlineEnd: root.style.paddingInlineEnd };

    root.style.overflow = 'hidden';
    if (gutter > 0) root.style.paddingInlineEnd = `${gutter}px`;

    restoreScroll = () => Object.assign(root.style, previous);
  }

  scrollLocks += 1;
  let released = false;

  return () => {
    if (released) return;
    released = true;
    scrollLocks -= 1;

    if (scrollLocks === 0) {
      restoreScroll?.();
      restoreScroll = null;
    }
  };
};

export const reloadPage = () => window.location.reload();

export const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

export const toRem = (pixels) => `${pixels / parseFloat(getComputedStyle(document.documentElement).fontSize)}rem`;

export const getExitTransform = (element, rotation = SKIP_ROTATION, axis = 'vertical') => {
  const { top, left, width, height } = element.getBoundingClientRect();
  const angle = (Math.abs(rotation) * Math.PI) / 180;

  if (axis === 'horizontal') {
    const viewport = document.documentElement.clientWidth;
    const reach = (width / 2) * Math.cos(angle) + (height / 2) * Math.sin(angle);
    const center = left + width / 2;
    const distance = rotation < 0 ? -(center + reach + SKIP_OFFSET) : viewport - center + reach + SKIP_OFFSET;

    return `translateX(${toRem(distance)}) rotate(${rotation}deg)`;
  }

  const lowest = (height / 2) * Math.cos(angle) + (width / 2) * Math.sin(angle);
  const distance = top + height / 2 + lowest + SKIP_OFFSET;

  return `translateY(${toRem(-distance)}) rotate(${rotation}deg)`;
};

export const animate = (element, keyframes, options) =>
  animateElement(element, keyframes, { duration: SKIP_DURATION, ...options });

export const createCardGhost = (source, container, modifier, { shallow = false } = {}) => {
  const ghost = source.cloneNode(!shallow);
  const sourceFields = source.querySelectorAll('input, textarea');

  ghost.classList.add('card-view__ghost', modifier);
  ghost.removeAttribute('id');
  ghost.style.transform = '';
  ghost.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  ghost.querySelectorAll('input, textarea').forEach((node, index) => {
    node.value = sourceFields[index].value;
  });
  ghost.querySelectorAll('.card-view__card-icon, .card-view__loading').forEach((node) => {
    node.style.viewTransitionName = 'none';
  });
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  Object.assign(ghost.style, {
    top: toRem(source.offsetTop),
    left: toRem(source.offsetLeft),
    width: toRem(source.offsetWidth),
    height: toRem(source.offsetHeight),
  });

  container.appendChild(ghost);
  return ghost;
};

export const springEasing = ({ mass, stiffness, damping }, duration, samples = 32) => {
  if (!globalThis.CSS?.supports?.('animation-timing-function', 'linear(0, 1)')) return FIGMA_EASE_OUT;

  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  const position = (time) => {
    if (zeta < 1) {
      const damped = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * time) * (Math.cos(damped * time) + ((zeta * omega) / damped) * Math.sin(damped * time));
    }
    return 1 - Math.exp(-omega * time) * (1 + omega * time);
  };

  const points = Array.from({ length: samples }, (_, index) => {
    const value = position(((index + 1) / samples) * (duration / 1000));
    return Number(value.toFixed(4));
  });
  points[points.length - 1] = 1;

  return `linear(0, ${points.join(', ')})`;
};

export const settleAfter = (signal, duration, settle) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => settle(resolve, reject), duration);

    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });