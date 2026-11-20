import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRef } from 'vue';
import {
  CURRENT_YEAR,
  DATE_PATTERN,
  MAX_YEAR,
  MIN_YEAR,
  PICKER_BUTTON_ID,
  PICKER_INPUT_ID,
  dateField,
  dateFormatters,
  fields,
  titleField,
} from './CardViewConfig';
import {
  createInitialValues,
  fieldId,
  focusById,
  focusFirstControl,
  toDate,
  toIsoDate,
} from './CardViewHelpers';
import { translate } from '../../locale';
import { createStatementValues } from './CardStatementHelpers';
import { findTitleLanguage } from '../../services/titleLanguages';

export function useCardEditor({ card, cardNumber, isPreview, timers, expand, collapse }) {
  const precisionOptions = [
    { value: 'year', label: translate('card-precision-year') },
    { value: 'month', label: translate('card-precision-month') },
    { value: 'day', label: translate('card-precision-day') },
  ];

  const isEditing = ref(false);
  const isDateEditing = ref(false);
  const titleSelection = ref(null);
  const titleInput = ref('');
  const titleLanguage = ref(null);
  const titleSuggestions = ref([]);
  const isTitleTouched = ref(false);
  const isTitleLanguageTouched = ref(false);
  const datePrecision = ref('year');
  const dateYears = reactive({ year: '', month: '' });
  const dateMonth = ref(null);
  const dateValue = ref('');
  const isPickerOpen = ref(false);
  const yearTouched = reactive({ year: false, month: false });
  const savedTitle = ref(null);
  const savedDate = ref(null);
  const editingList = ref(null);
  const listChips = ref([]);
  const listSelected = ref([]);
  const listInput = ref('');
  const listMenuItems = ref([]);
  const savedLists = reactive({});
  const initialValues = ref({ title: null, date: null, lists: {} });

  let isMousePressed = false;

  const dateYear = computed({
    get: () => dateYears[datePrecision.value] ?? '',
    set: (value) => {
      dateYears[datePrecision.value] = value;
    },
  });

  const isYearTouched = computed(() => yearTouched[datePrecision.value]);

  const buildListMenuItems = (field, query) => {
    const term = query.trim().toLowerCase();
    if (!term) return [{ label: translate('card-suggestions'), items: [] }, ...field.suggestions];
    const matches = field.suggestions.filter(({ label }) => label.toLowerCase().includes(term));
    return field.showDescriptionOnSearch ? matches : matches.map(({ value, label }) => ({ value, label }));
  };

  const buildTitleSuggestions = () => [
    { label: translate('card-suggestions'), items: [] },
    { value: card.value.label, label: card.value.label, description: translate('card-suggestion-from-label') },
  ];

  const canSubmitList = computed(() => listChips.value.length > 0);

  const selectedTitleLanguage = computed(() => findTitleLanguage(titleLanguage.value));

  const canSubmit = computed(() =>
    titleInput.value.trim() !== '' && selectedTitleLanguage.value !== null
  );

  const titleError = computed(() => isTitleTouched.value && titleInput.value.trim() === '');

  const titleLanguageError = computed(() => isTitleLanguageTouched.value && titleLanguage.value === null);

  const isYearValid = computed(() => {
    const year = Number(dateYear.value);
    return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR;
  });

  const yearError = computed(() => {
    if (!isYearTouched.value) return '';
    if (dateYear.value === '') return 'card-year-empty-error';
    return isYearValid.value ? '' : 'card-year-invalid-error';
  });

  const dayLabel = computed(() => {
    if (!DATE_PATTERN.test(dateValue.value)) return '';
    const [year, month, day] = dateValue.value.split('-').map(Number);
    return dateFormatters.day.format(toDate(year, month, day));
  });

  const dateValidators = {
    year: () => isYearValid.value,
    month: () => isYearValid.value && dateMonth.value !== null,
    day: () => DATE_PATTERN.test(dateValue.value),
  };

  const canSubmitDate = computed(() => dateValidators[datePrecision.value]());

  const pressMouse = () => {
    isMousePressed = true;
  };

  const releaseMouse = () => {
    isMousePressed = false;
  };

  const markTouched = (touched) => {
    if (!isMousePressed) {
      touched.value = true;
      return;
    }

    document.addEventListener(
      'mouseup',
      () => {
        timers.push(
          setTimeout(() => {
            touched.value = true;
          })
        );
      },
      { once: true }
    );
  };

  const onTitleBlur = () => markTouched(isTitleTouched);

  const onTitleLanguageBlur = () => markTouched(isTitleLanguageTouched);

  const onYearBlur = () => markTouched(toRef(yearTouched, datePrecision.value));

  const resetEdit = () => {
    isPreview.value = false;
    isEditing.value = false;
    isDateEditing.value = false;
    editingList.value = null;
    Object.keys(savedLists).forEach((property) => delete savedLists[property]);

    initialValues.value = card.value?.statements
      ? createStatementValues(card.value).values
      : { title: null, date: null, lists: {} };
    savedTitle.value = initialValues.value.title;
    savedDate.value = initialValues.value.date;
    Object.assign(savedLists, initialValues.value.lists);
  };

  const onTitleInput = () => {
    titleSuggestions.value = buildTitleSuggestions();
  };

  const startEditing = (container) => {
    focusFirstControl(container);
  };

  const openEdit = () => {
    expand(titleField.property);
    titleInput.value = savedTitle.value?.text ?? '';
    titleLanguage.value = savedTitle.value?.language?.value ?? savedTitle.value?.language ?? null;
    titleSelection.value = null;
    titleSuggestions.value = buildTitleSuggestions();
    isTitleTouched.value = false;
    isTitleLanguageTouched.value = false;
    isEditing.value = true;
    startEditing();
  };

  const closeEdit = () => {
    collapse(titleField.property);
    isEditing.value = false;
    focusById(fieldId(titleField.property));
  };

  const saveTitle = () => {
    if (!canSubmit.value) return;
    savedTitle.value = {
      text: titleInput.value.trim(),
      language: selectedTitleLanguage.value,
    };
    closeEdit();
  };

  const buildSavedDate = () => {
    const precision = datePrecision.value;
    const [year, month, day] =
      precision === 'day'
        ? dateValue.value.split('-').map(Number)
        : [Number(dateYear.value), precision === 'month' ? dateMonth.value : 1, 1];

    return {
      text: dateFormatters[precision].format(toDate(year, month, day)),
      precision,
      years: { ...dateYears },
      month: dateMonth.value,
      date: dateValue.value,
    };
  };

  const openDateEdit = () => {
    expand(dateField.property);
    const now = new Date();
    const saved = savedDate.value;
    datePrecision.value = saved?.precision ?? 'year';
    dateYears.year = saved?.years.year ?? now.getFullYear();
    dateYears.month = saved?.years.month ?? now.getFullYear();
    dateMonth.value = saved?.month ?? now.getMonth() + 1;
    dateValue.value = saved?.date ?? toIsoDate(now);
    yearTouched.year = false;
    yearTouched.month = false;
    isDateEditing.value = true;
    startEditing('.card-view__date-input');
  };

  const closeDateEdit = () => {
    collapse(dateField.property);
    isDateEditing.value = false;
    focusById(fieldId(dateField.property));
  };

  const saveDate = () => {
    if (!canSubmitDate.value) return;
    savedDate.value = buildSavedDate();
    closeDateEdit();
  };

  const onListInput = (value) => {
    if (editingList.value) listMenuItems.value = buildListMenuItems(editingList.value, `${value}`);
  };

  const openListEdit = (field) => {
    expand(field.property);
    const saved = savedLists[field.property];
    listChips.value = saved ? saved.chips.map((chip) => ({ ...chip })) : [];
    listSelected.value = saved ? [...saved.selected] : [];
    listInput.value = '';
    listMenuItems.value = buildListMenuItems(field, '');
    editingList.value = field;
    startEditing();
  };

  const closeListEdit = () => {
    const property = editingList.value?.property;
    collapse(property);
    editingList.value = null;
    focusById(fieldId(property));
  };

  const saveList = () => {
    if (!canSubmitList.value) return;
    savedLists[editingList.value.property] = {
      chips: listChips.value.map(({ value, label }) => ({ value, label })),
      selected: [...listSelected.value],
      text: listChips.value.map(({ label }) => label).join(', '),
    };
    closeListEdit();
  };

  const openField = (field) => {
    if (field === titleField) openEdit();
    else if (field === dateField) openDateEdit();
    else openListEdit(field);
  };

  const stepYear = (delta) => {
    const year = Number(dateYear.value);
    const next = dateYear.value === '' || !Number.isFinite(year) ? CURRENT_YEAR : year + delta;
    dateYear.value = Math.min(Math.max(Math.trunc(next), MIN_YEAR), MAX_YEAR);
  };

  const openDatePicker = async () => {
    isPickerOpen.value = true;
    await nextTick();

    const input = document.getElementById(PICKER_INPUT_ID);
    input?.focus();

    try {
      input?.showPicker();
    } catch (err) {
      console.error('[Qlaris] Unable to open date picker:', err);
    }
  };

  const closePicker = () => {
    isPickerOpen.value = false;
    focusById(PICKER_BUTTON_ID);
  };

  const snapshotEditor = () => ({
    isEditing: isEditing.value,
    isDateEditing: isDateEditing.value,
    editingList: editingList.value?.property ?? null,
    initialValues: initialValues.value,
    savedTitle: savedTitle.value,
    savedDate: savedDate.value,
    savedLists,
    titleInput: titleInput.value,
    titleLanguage: titleLanguage.value,
    titleSelection: titleSelection.value,
    isTitleTouched: isTitleTouched.value,
    isTitleLanguageTouched: isTitleLanguageTouched.value,
    datePrecision: datePrecision.value,
    dateYears,
    dateMonth: dateMonth.value,
    dateValue: dateValue.value,
    yearTouched,
    listChips: listChips.value,
    listSelected: listSelected.value,
    listInput: listInput.value,
  });

  const restoreEditor = (snapshot) => {
    isEditing.value = snapshot.isEditing;
    isDateEditing.value = snapshot.isDateEditing;
    initialValues.value = snapshot.initialValues;
    savedTitle.value = snapshot.savedTitle;
    savedDate.value = snapshot.savedDate;
    Object.keys(savedLists).forEach((property) => delete savedLists[property]);
    Object.assign(savedLists, snapshot.savedLists);
    titleInput.value = snapshot.titleInput;
    titleLanguage.value = snapshot.titleLanguage;
    titleSelection.value = snapshot.titleSelection;
    isTitleTouched.value = snapshot.isTitleTouched;
    isTitleLanguageTouched.value = snapshot.isTitleLanguageTouched;
    titleSuggestions.value = buildTitleSuggestions();
    datePrecision.value = snapshot.datePrecision;
    Object.assign(dateYears, snapshot.dateYears);
    dateMonth.value = snapshot.dateMonth;
    dateValue.value = snapshot.dateValue;
    Object.assign(yearTouched, snapshot.yearTouched);
    listChips.value = snapshot.listChips;
    listSelected.value = snapshot.listSelected;
    listInput.value = snapshot.listInput;
    editingList.value = fields.find((field) => field.property === snapshot.editingList) ?? null;
    if (editingList.value) listMenuItems.value = buildListMenuItems(editingList.value, snapshot.listInput);
  };

  onMounted(() => {
    document.addEventListener('mousedown', pressMouse, true);
    document.addEventListener('mouseup', releaseMouse, true);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', pressMouse, true);
    document.removeEventListener('mouseup', releaseMouse, true);
  });

  return {
    precisionOptions,
    isEditing,
    isDateEditing,
    titleSelection,
    titleInput,
    titleLanguage,
    titleSuggestions,
    datePrecision,
    dateMonth,
    dateValue,
    isPickerOpen,
    savedTitle,
    savedDate,
    editingList,
    listChips,
    listSelected,
    listInput,
    listMenuItems,
    savedLists,
    dateYear,
    canSubmit,
    canSubmitDate,
    canSubmitList,
    titleError,
    titleLanguageError,
    yearError,
    dayLabel,
    openEdit,
    closeEdit,
    saveTitle,
    openDateEdit,
    closeDateEdit,
    saveDate,
    openListEdit,
    closeListEdit,
    saveList,
    openField,
    onTitleInput,
    onTitleBlur,
    onTitleLanguageBlur,
    onYearBlur,
    onListInput,
    stepYear,
    openDatePicker,
    closePicker,
    resetEdit,
    snapshotEditor,
    restoreEditor,
    initialValues,
  };
}