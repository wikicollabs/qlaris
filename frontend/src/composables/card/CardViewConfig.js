import { markRaw } from 'vue';
import { cdxIconAdd, cdxIconCalendar, cdxIconLanguage } from '@wikimedia/codex-icons';
import AlbumCover from '../../assets/AlbumCover.vue';

const albumCover = markRaw( AlbumCover );

export const LOADING_DURATION = 2000;
export const COVER_DURATION = 1500;
export const COVER_ART_TIMEOUT = 10000;
export const SUBMIT_DURATION = 2000;
export const SUCCESS_DURATION = 2000;
export const REQUEST_TIMEOUT = 10000;
export const FIGMA_EASE_OUT = 'ease-out';
export const SKIP_DURATION = 200;
export const SKIP_DRAG_DURATION = 700;
export const SKIP_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const SKIP_ROTATION = 2;
export const SKIP_OFFSET = 8;
export const SKIP_DRAG_THRESHOLD = 6;
export const SKIP_DRAG_DISTANCE = 0.2;
export const SKIP_DRAG_VELOCITY = 0.5;
export const SKIP_DRAG_RESISTANCE = 1.35;
export const SKIP_DRAG_RESISTANCE_RANGE = 100;
export const SKIP_BOUNCE_DURATION = 350;
export const STACK_STEP = '0.5rem';
export const STACK_DURATION = 200;
export const STACK_EASE = FIGMA_EASE_OUT;
export const EXPAND_DURATION = 200;
export const EXPAND_EASE = FIGMA_EASE_OUT;
export const EXPAND_TOP_CATCHUP = 0.35;
export const DISSOLVE_DURATION = 200;
export const DISSOLVE_EASE = FIGMA_EASE_OUT;
export const SPLASH_DISSOLVE_DURATION = 268;
export const SPLASH_DISSOLVE_SPRING = { mass: 2, stiffness: 2200, damping: 120 };
export const TOAST_DURATION = 2750;
export const TOAST_DISMISS_GRACE = 1000;
export const MIN_YEAR = 1800;
export const MAX_YEAR = 9999;
export const CURRENT_YEAR = new Date().getFullYear();
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const ENTITY_LABEL_ID_PATTERN = /^(.*)(\s\(Q\d+\))$/;
export const YEAR_INPUT_ID = 'card-year-input';
export const PICKER_INPUT_ID = 'card-date-picker-input';
export const PICKER_BUTTON_ID = 'card-date-picker-button';
export const NEXT_BUTTON_ID = 'card-next-button';

export const DEFAULT_CARD = {
  id: 'Q208902',
  label: '19',
  aliases: [],
  instanceOf: { id: 'Q482994', label: 'album' },
  performer: { id: 'Q23215', label: 'Adele' },
  description: '2008 debut studio album by Adele',
  cover: albumCover,
  coverSource: 'Cover Art Archive',
};

export const CARDS = {
  3: {
    id: 'Q3103640123',
    label: 'Sample Music',
    aliases: [],
    instanceOf: null,
    performer: null,
    description: null,
    cover: albumCover,
    coverSource: null,
  },
  4: {
    id: 'Q21780569',
    label: 'I like it when you sleep, for you are so beautiful yet so unaware of it',
    aliases: ['ILIWYSFYASBYSUOI'],
    instanceOf: { id: 'Q482994', label: 'album' },
    performer: { id: 'Q2811247', label: 'The 1975' },
    description: '2016 studio album by The 1975',
    cover: albumCover,
    coverSource: 'Cover Art Archive',
  },
};

export const titleField = { property: 'P1476', label: 'title', placeholder: 'card-add-title', icon: cdxIconAdd };

export const dateField = { property: 'P577', label: 'publication date', placeholder: 'card-add-date', icon: cdxIconCalendar };

const recordLabelField = {
  property: 'P264',
  label: 'record label',
  placeholder: 'card-add-record-labels',
  searchPlaceholder: 'card-search-record-labels',
  showDescriptionOnSearch: true,
  icon: cdxIconAdd,
  suggestions: [
    { value: 'Q1123947', label: 'XL Recordings (Q1123947)', description: 'country: United Kingdom' },
    { value: 'Q183387', label: 'Columbia Records (Q183387)', description: 'country: United States' },
    { value: 'Q330629', label: 'Sony Music (Q330629)', description: 'country: United States' },
  ],
};

const languageField = {
  property: 'P407',
  label: 'language of work',
  placeholder: 'card-add-languages',
  searchPlaceholder: 'card-search-languages',
  icon: cdxIconLanguage,
  suggestions: [
    { value: 'en', label: 'English (en)', description: 'performer’s native language (P103)' },
    {
      value: 'it',
      label: 'Italiano (it)',
      description: 'performer’s spoken, written or signed language (P1412)',
    },
  ],
};

export const fields = [titleField, dateField, recordLabelField, languageField];

export const PREFILLED_VALUES = {
  2: {
    title: { text: DEFAULT_CARD.label, language: 'en' },
    date: '2008-01-28',
    lists: { [recordLabelField.property]: ['Q1123947', 'Q330629'] },
  },
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long' });

export const months = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: monthFormatter.format(new Date(2000, index, 1)),
}));

const { locale: userLocale } = new Intl.DateTimeFormat().resolvedOptions();
const dayLocale = userLocale.startsWith('en') ? 'en-GB' : userLocale;

export const dateFormatters = {
  year: new Intl.DateTimeFormat(undefined, { year: 'numeric' }),
  month: new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }),
  day: new Intl.DateTimeFormat(dayLocale, { day: 'numeric', month: 'long', year: 'numeric' }),
};