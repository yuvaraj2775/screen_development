import { FormattedText } from './types';

export const createFormattedText = (
  text: string,
  highlighted: string,
  style: string
): FormattedText[] => {
  if (!text) return [];

  const segments: FormattedText[] = [];
  const words = text.split(' ');
  const highlightedWords = highlighted
    .split(' ')
    .map(word => word.trim())
    .filter(Boolean);

  words.forEach((word, index) => {
    const isHighlighted = highlightedWords.includes(word.trim());
    const isBold = style.toLowerCase().includes('bold');
    const isItalic = style.toLowerCase().includes('italic');
    const isUnderline = style.toLowerCase().includes('underline');
    const isH1 = style.toLowerCase().includes('h1');
    const isH2 = style.toLowerCase().includes('h2');
    const isH3 = style.toLowerCase().includes('h3');

    segments.push({
      text: word + (index < words.length - 1 ? ' ' : ''),
      style: {
        bold: isBold,
        italic: isItalic,
        textDecorationLine: isUnderline ? 'underline' : 'none',
        fontSize: isH1 ? 32 : isH2 ? 28 : isH3 ? 24 : 18,
        highlighted: isHighlighted,
      },
    });
  });

  return segments;
}; 