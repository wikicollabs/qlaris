import { computed } from 'vue';
import { fields } from './CardViewConfig';
import { getSignature, getValue, toStatementValue } from './CardViewHelpers';

export function useCardChanges({ savedTitle, savedDate, savedLists, initialValues }) {
  const hasSavedValue = computed(
    () => savedTitle.value !== null || savedDate.value !== null || Object.keys(savedLists).length > 0
  );

  const savedValues = computed(() => ({ title: savedTitle.value, date: savedDate.value, lists: savedLists }));

  const fieldChanges = computed(() =>
    Object.fromEntries(
      fields.flatMap((field) => {
        const current = getValue(savedValues.value, field);
        if (!current) return [];

        const original = getValue(initialValues.value, field);
        if (!original) return [[field.property, { before: null }]];

        return getSignature(field, current) === getSignature(field, original)
          ? []
          : [[field.property, { before: original }]];
      })
    )
  );

  const isEdited = (field) => Boolean(fieldChanges.value[field.property]?.before);

  const hasChanges = computed(() => Object.keys(fieldChanges.value).length > 0);

  const hasEditedStatements = computed(() => fields.some(isEdited));

  const previewStatements = computed(() =>
    fields.flatMap((field) => {
      const change = fieldChanges.value[field.property];
      if (!change) return [];

      const after = toStatementValue(getValue(savedValues.value, field));

      return [
        {
          property: field.property,
          label: field.label,
          ...after,
          changes: change.before
            ? [
                { type: 'before', labelKey: 'card-before', ...toStatementValue(change.before) },
                { type: 'after', labelKey: 'card-after', ...after },
              ]
            : null,
        },
      ];
    })
  );

  return {
    hasSavedValue,
    isEdited,
    hasChanges,
    hasEditedStatements,
    previewStatements,
  };
}