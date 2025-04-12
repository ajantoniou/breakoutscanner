import { useState, useMemo } from 'react';
import { PatternData } from '@/services/types/patternTypes';

type SortDirection = 'asc' | 'desc';

interface UseSortPatternsResult {
  sortedPatterns: PatternData[];
  sortField: string;
  sortDirection: SortDirection;
  handleSort: (field: string) => void;
}

/**
 * Custom hook for sorting patterns with special handling for multi-timeframe confirmed patterns
 * @param patterns Array of pattern data to sort
 * @param initialSortField Initial field to sort by
 * @param initialSortDirection Initial sort direction
 * @param prioritizeMultiTimeframe Whether to prioritize multi-timeframe confirmed patterns regardless of sort
 * @returns Sorted patterns and sort control functions
 */
export const useSortPatterns = (
  patterns: PatternData[],
  initialSortField: string = 'confidenceScore',
  initialSortDirection: SortDirection = 'desc',
  prioritizeMultiTimeframe: boolean = true
): UseSortPatternsResult => {
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  // Handle sort field click
  const handleSort = (field: string) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default direction
      setSortField(field);
      // For most fields, default to descending (higher values first)
      if (field === 'symbol' || field === 'timeframe' || field === 'patternType') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Memoize the sorted patterns to avoid unnecessary recomputation
  const sortedPatterns = useMemo(() => {
    // Create a copy of the patterns array to avoid mutating the original
    const sortablePatterns = [...patterns];

    // Sort by the selected field
    sortablePatterns.sort((a, b) => {
      // Special handling for nested properties or undefined values
      let aValue: any = sortField.includes('.') 
        ? sortField.split('.').reduce((obj, key) => obj && obj[key], a) 
        : a[sortField];
      
      let bValue: any = sortField.includes('.')
        ? sortField.split('.').reduce((obj, key) => obj && obj[key], b)
        : b[sortField];

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) aValue = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bValue === undefined || bValue === null) bValue = sortDirection === 'asc' ? Infinity : -Infinity;

      // Handle boolean values
      if (typeof aValue === 'boolean') aValue = aValue ? 1 : 0;
      if (typeof bValue === 'boolean') bValue = bValue ? 1 : 0;

      // Handle string values (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numeric values
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // If prioritizing multi-timeframe confirmed patterns, move them to the top
    if (prioritizeMultiTimeframe && sortField !== 'multiTimeframeConfirmed') {
      const confirmedPatterns = sortablePatterns.filter(p => p.multiTimeframeConfirmed);
      const nonConfirmedPatterns = sortablePatterns.filter(p => !p.multiTimeframeConfirmed);
      
      // Sort each group separately by the selected field
      return [...confirmedPatterns, ...nonConfirmedPatterns];
    }

    return sortablePatterns;
  }, [patterns, sortField, sortDirection, prioritizeMultiTimeframe]);

  return {
    sortedPatterns,
    sortField,
    sortDirection,
    handleSort
  };
};

export default useSortPatterns; 