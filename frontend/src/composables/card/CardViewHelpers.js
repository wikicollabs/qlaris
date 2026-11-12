import { nextTick } from 'vue';
import { animateElement } from '../UseAnimation';
import {
  ENTITY_LABEL_ID_PATTERN,
  PREFILLED_VALUES,
  SKIP_DURATION,
  SKIP_OFFSET,
  SKIP_ROTATION,
  dateField,
  dateFormatters,
  fields,
  titleField,
  titleLanguages,
} from './CardViewConfig';

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
          language: titleLanguages.find(({ value }) => value === prefilled.title.language),
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

export const reloadPage = () => window.location.reload();

export const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

export const toRem = (pixels) => `${pixels / parseFloat(getComputedStyle(document.documentElement).fontSize)}rem`;

export const getExitTransform = (element) => {
  const { top, width, height } = element.getBoundingClientRect();
  const angle = (SKIP_ROTATION * Math.PI) / 180;
  const lowest = (height / 2) * Math.cos(angle) + (width / 2) * Math.sin(angle);
  const distance = top + height / 2 + lowest + SKIP_OFFSET;

  return `translateY(${toRem(-distance)}) rotate(${SKIP_ROTATION}deg)`;
};

export const animate = (element, keyframes, options) =>
  animateElement(element, keyframes, { duration: SKIP_DURATION, ...options });

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