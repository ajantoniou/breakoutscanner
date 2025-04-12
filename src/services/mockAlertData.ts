
import { PatternData, AlertData as AlertDataType } from './types/patternTypes';
import { getAlerts, getAlertStats, filterPatternsByTimeframe } from './generators/alertGenerator';
import { initialPatterns } from './mockData';

// Generate initial alerts from our patterns
export const initialAlerts = getAlerts(initialPatterns, 15);

// Re-export for easier importing
export { getAlertStats, filterPatternsByTimeframe };

// Re-export the type using 'export type' for module isolation
export type { AlertDataType as AlertData };
