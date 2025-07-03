/**
 * Utility functions for batch job name generation
 */

import { FINANCIAL_THEMES, TIME_BASED_PREFIXES, SIZE_BASED_NAMES } from './themes';

export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function getSizeCategory(count: number): keyof typeof SIZE_BASED_NAMES {
  if (count < 50) return 'small';
  if (count < 200) return 'medium'; 
  if (count < 500) return 'large';
  return 'huge';
}

export function getTimeCategory(date: Date): string {
  const hour = date.getHours();
  const day = date.getDay();
  
  if (day === 0 || day === 6) return 'weekend';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

export function getRandomPrefix(sizeCategory: string, timeCategory: string): string {
  const sizeWords = SIZE_BASED_NAMES[sizeCategory as keyof typeof SIZE_BASED_NAMES] || ['Smart'];
  const timeWords = TIME_BASED_PREFIXES[timeCategory as keyof typeof TIME_BASED_PREFIXES] || ['Quick'];
  
  // Mix size and time prefixes
  const allPrefixes = [...sizeWords, ...timeWords, ...FINANCIAL_THEMES.descriptors];
  return getRandomElement(allPrefixes);
}

export function getRandomMainTerm(): string {
  const allTerms = [
    ...FINANCIAL_THEMES.money,
    ...FINANCIAL_THEMES.banking,
    ...FINANCIAL_THEMES.business
  ];
  return getRandomElement(allTerms);
}

export function getSuffix(count: number): string {
  if (count > 500) return 'Powerhouse';
  if (count > 200) return 'Machine';
  if (count > 100) return 'Engine';
  if (count > 50) return 'Hub';
  return 'Station';
}

export function getTimeBasedName(date: Date): string {
  const timeCategory = getTimeCategory(date);
  const timeWords = TIME_BASED_PREFIXES[timeCategory as keyof typeof TIME_BASED_PREFIXES] || ['Quick'];
  return getRandomElement(timeWords);
}

export function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .slice(0, 2) // Take first 2 words max
    .join(' ');
}
