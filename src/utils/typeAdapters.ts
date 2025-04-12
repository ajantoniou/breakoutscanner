
/**
 * Direction type mapping
 */
export type DirectionType = 'bullish' | 'bearish' | 'neutral';
export type LegacyDirectionType = 'up' | 'down' | 'sideways';

/**
 * Adapts legacy direction types to new direction types
 */
export const adaptDirectionType = (
  direction: LegacyDirectionType | DirectionType | string
): DirectionType => {
  switch (direction) {
    case 'up':
      return 'bullish';
    case 'down':
      return 'bearish';
    case 'sideways':
      return 'neutral';
    default:
      return direction as DirectionType;
  }
};

/**
 * Convert boolean returning functions to void returning functions
 */
export const adaptBooleanToVoid = <T extends (...args: any[]) => Promise<boolean>>(
  fn: T
): ((...args: Parameters<T>) => Promise<void>) => {
  return async (...args: Parameters<T>) => {
    await fn(...args);
  };
};

/**
 * Safely access a property on a generic type
 */
export const safelyGetProperty = <T, K extends string>(
  obj: T, 
  key: K
): any => {
  if (!obj) return undefined;
  return (obj as any)[key];
};
