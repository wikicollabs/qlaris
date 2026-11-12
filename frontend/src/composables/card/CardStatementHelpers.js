
import { dateFormatters } from './CardViewConfig';
import { toDate, toIsoDate } from './CardViewHelpers';

const PROPERTIES = ['P1476', 'P577', 'P264', 'P407'];
const QID_PATTERN = /^Q[1-9]\d*$/;
const DATE_PATTERN = /^([+-])(\d{4,})-(\d{2})-(\d{2})T00:00:00Z$/;
const PRECISIONS = { 9: 'year', 10: 'month', 11: 'day' };

const activeStatements = (item, property) =>
  (item.statements?.[property] ?? []).filter(
    (statement) => statement.rank === 'preferred' || statement.rank === 'normal'
  );

const rankedStatements = (statements) => [
  ...statements.filter((statement) => statement.rank === 'preferred'),
  ...statements.filter((statement) => statement.rank === 'normal'),
];

const contents = (statement) =>
  statement?.value?.type === 'value' ? statement.value.content : null;

const parseTitle = (statement) => {
  const content = contents(statement);
  if (
    statement.dataType !== 'monolingualtext' ||
    typeof content?.text !== 'string' ||
    typeof content?.language !== 'string' ||
    !content.language
  ) return null;

  return {
    text: content.text,
    language: { value: content.language, label: content.language },
  };
};

const parseDate = (statement) => {
  const content = contents(statement);
  if (statement.dataType !== 'time' || typeof content?.time !== 'string') return null;

  const precision = PRECISIONS[content.precision];
  const match = content.time.match(DATE_PATTERN);
  if (!precision || !match || match[1] !== '+') return null;

  const year = Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  if (!Number.isSafeInteger(year) || year < 1 || year > 9999) return null;
  if (precision !== 'year' && (month < 1 || month > 12)) return null;
  if (precision === 'day') {
    const date = toDate(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return null;
  }

  const displayMonth = precision === 'year' ? 1 : month;
  const displayDay = precision === 'day' ? day : 1;
  const date = toDate(year, displayMonth, displayDay);

  return {
    text: dateFormatters[precision].format(date),
    precision,
    years: { year, month: year },
    month: displayMonth,
    date: toIsoDate(date),
  };
};

const parseList = (statements, item) => {
  const chips = [];
  const selected = [];

  for (const statement of statements) {
    const id = contents(statement);
    if (statement.dataType !== 'wikibase-item' || typeof id !== 'string' || !QID_PATTERN.test(id)) {
      return null;
    }

    if (selected.includes(id)) continue;
    const name = item.entities?.[id]?.label || id;
    const label = `${name} (${id})`;
    selected.push(id);
    chips.push({ value: id, label });
  }

  return { chips, selected, text: chips.map(({ label }) => label).join(', ') };
};

/**
 * Convert Wikidata statements into the current editor's value format.
 * For single-value fields, prefer a valid preferred-rank statement over normal rank.
 * Report properties with active statements that cannot be represented.
 */
export const createStatementValues = (item) => {
  const values = { title: null, date: null, lists: {} };
  const unsupported = [];

  for (const property of PROPERTIES) {
    const statements = activeStatements(item, property);
    if (statements.length === 0) continue;

    if (property === 'P1476' || property === 'P577') {
      const parse = property === 'P1476' ? parseTitle : parseDate;
      const value = rankedStatements(statements)
        .map(parse)
        .find((parsed) => parsed !== null) ?? null;
      if (!value) {
        unsupported.push(property);
      } else if (property === 'P1476') {
        values.title = value;
      } else {
        values.date = value;
      }
      continue;
    }

    const value = parseList(statements, item);
    if (!value) {
      unsupported.push(property);
    } else {
      values.lists[property] = value;
    }
  }

  return { values, unsupported };
};
