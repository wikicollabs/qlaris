import { 
  cdxIconBook, 
  cdxIconMusicalScore, 
  cdxIconPalette,
  // Add new icons here
} from '@wikimedia/codex-icons';

export const categories = [
  {
    id: 'music',
    label: 'Musical releases',
    icon: cdxIconMusicalScore,
    background: 'var(--color-option-orange)',
    iconColor: 'var(--color-orange100)',
  },
  {
    id: 'books',
    label: 'Books',
    icon: cdxIconBook,
    background: 'var(--color-option-blue)',
    iconColor: 'var(--color-blue100)',
  },
  {
    id: 'paintings',
    label: 'Paintings',
    icon: cdxIconPalette,
    background: 'var(--color-option-pink)',
    iconColor: 'var(--color-pink100)',
  },
  // Add new categories here 
];

export const findCategory = (id) => 
  categories.find((category) => category.id === id) ?? categories[0];