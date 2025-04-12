
/**
 * Pattern detection algorithms
 * This module exports all pattern detection functions
 */

import { detectDoubleBottom } from './doubleBottomDetector';
import { detectDoubleTop } from './doubleTopDetector';
import { detectBullFlag } from './bullFlagDetector';
import { detectBearFlag } from './bearFlagDetector';

// Named exports
export {
  detectDoubleBottom,
  detectDoubleTop,
  detectBullFlag,
  detectBearFlag
};

// Note: No default exports to re-export
