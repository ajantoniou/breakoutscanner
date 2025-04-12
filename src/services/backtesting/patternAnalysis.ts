
import { PatternData } from '../types/patternTypes';
import { HistoricalPrice } from './backtestTypes';

// Re-export functions from new modules
export { determinePatternDirection } from './utils/patternDirection';
export { calculateCandlesToBreakout } from './utils/breakoutAnalysis';
export { validatePattern } from './utils/patternValidation';

// Re-export validators
export {
  validateDoubleBottom,
  validateDoubleTop,
  validateFlag
} from './validators/patternValidators';
