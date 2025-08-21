import { describe, expect, it, expectTypeOf } from 'vitest';
import { updateFilterValue, type FilterCriteria } from './AdvancedSearchFilters';

const baseFilters: FilterCriteria = {
  searchTerm: '',
  classification: 'all',
  sicCode: '',
  confidenceRange: [0, 100],
  dateRange: { start: null, end: null },
  isDuplicate: null,
  hasErrors: null,
};

describe('updateFilterValue', () => {
  it('updates searchTerm', () => {
    const updated = updateFilterValue(baseFilters, 'searchTerm', 'foo');
    expect(updated.searchTerm).toBe('foo');
    expectTypeOf(updated.searchTerm).toBeString();
    // @ts-expect-error value must be string
    updateFilterValue(baseFilters, 'searchTerm', 123);
  });

  it('updates classification', () => {
    const updated = updateFilterValue(baseFilters, 'classification', 'business');
    expect(updated.classification).toBe('business');
    expectTypeOf(updated.classification).toBeString();
    // @ts-expect-error value must be string
    updateFilterValue(baseFilters, 'classification', 456);
  });

  it('updates sicCode', () => {
    const updated = updateFilterValue(baseFilters, 'sicCode', '7372');
    expect(updated.sicCode).toBe('7372');
    expectTypeOf(updated.sicCode).toBeString();
    // @ts-expect-error value must be string
    updateFilterValue(baseFilters, 'sicCode', false);
  });

  it('updates confidenceRange', () => {
    const updated = updateFilterValue(baseFilters, 'confidenceRange', [10, 90]);
    expect(updated.confidenceRange).toEqual([10, 90]);
    expectTypeOf(updated.confidenceRange).toEqualTypeOf<[number, number]>();
    // @ts-expect-error value must be tuple of numbers
    updateFilterValue(baseFilters, 'confidenceRange', [10, '90']);
  });

  it('updates dateRange', () => {
    const range = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
    const updated = updateFilterValue(baseFilters, 'dateRange', range);
    expect(updated.dateRange).toEqual(range);
    expectTypeOf(updated.dateRange).toEqualTypeOf<{ start: Date | null; end: Date | null }>();
    // @ts-expect-error value must be date range object
    updateFilterValue(baseFilters, 'dateRange', '2024');
  });

  it('updates isDuplicate', () => {
    const updated = updateFilterValue(baseFilters, 'isDuplicate', true);
    expect(updated.isDuplicate).toBe(true);
    expectTypeOf(updated.isDuplicate).toEqualTypeOf<boolean | null>();
    // @ts-expect-error value must be boolean or null
    updateFilterValue(baseFilters, 'isDuplicate', 'yes');
  });

  it('updates hasErrors', () => {
    const updated = updateFilterValue(baseFilters, 'hasErrors', false);
    expect(updated.hasErrors).toBe(false);
    expectTypeOf(updated.hasErrors).toEqualTypeOf<boolean | null>();
    // @ts-expect-error value must be boolean or null
    updateFilterValue(baseFilters, 'hasErrors', 'no');
  });
});
