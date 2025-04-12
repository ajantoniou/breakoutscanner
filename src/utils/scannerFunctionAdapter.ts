
/**
 * scannerFunctionAdapter.ts
 * Adapters for handling function return type mismatches
 */

/**
 * Converts a function returning Promise<boolean> to one returning Promise<void>
 */
export function adaptBooleanToVoid<T extends any[]>(
  fn: (...args: T) => Promise<boolean>
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    try {
      await fn(...args);
      return;
    } catch (error) {
      console.error('Error in adapted function:', error);
      throw error;
    }
  };
}

/**
 * Converts a function returning any value to one returning Promise<void>
 */
export function adaptToVoid<T extends any[]>(
  fn: (...args: T) => any
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    try {
      await fn(...args);
      return;
    } catch (error) {
      console.error('Error in adapted function:', error);
      throw error;
    }
  };
}

/**
 * Converts a function returning Promise<void> to one returning Promise<boolean>
 */
export function adaptVoidToBoolean<T extends any[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<boolean> {
  return async (...args: T): Promise<boolean> => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      console.error('Error in adapted function:', error);
      return false;
    }
  };
}

/**
 * Adapts function arguments to match expected parameter counts
 */
export function adaptArgumentCount<T extends any[], U extends any[]>(
  fn: (...args: T) => any,
  argAdapter: (args: U) => T
): (...args: U) => ReturnType<typeof fn> {
  return (...args: U) => {
    const adaptedArgs = argAdapter(args);
    return fn(...adaptedArgs);
  };
}

/**
 * Function adapters to help with type compatibility between different parts of the app
 */

/**
 * Adapts a function that returns any value to return a boolean Promise.
 * Useful for adapting functions to interfaces expecting boolean return values.
 */
export function adaptToBoolean<T extends (...args: any[]) => any>(
  func: T,
  defaultReturnValue: boolean = true
): (...args: Parameters<T>) => Promise<boolean> {
  return async (...args: Parameters<T>): Promise<boolean> => {
    try {
      await func(...args);
      return defaultReturnValue;
    } catch (error) {
      console.error('Error in adapted function:', error);
      return !defaultReturnValue;
    }
  };
}

/**
 * Creates a function that calls the original function and returns a successful Promise.
 * Useful for adapting sync functions to async interfaces.
 */
export function createSuccessPromise<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => Promise<boolean> {
  return async (...args: Parameters<T>): Promise<boolean> => {
    try {
      func(...args);
      return true;
    } catch (error) {
      console.error('Error in wrapped function:', error);
      return false;
    }
  };
}

/**
 * Adapts a function to ensure date strings are converted properly between components
 */
export function adaptDateHandling<T extends (...args: any[]) => any>(
  func: T,
  dateParamIndex: number = 0
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const newArgs = [...args] as any[];
    if (typeof newArgs[dateParamIndex] === 'string') {
      newArgs[dateParamIndex] = new Date(newArgs[dateParamIndex]);
    }
    return func(...newArgs as Parameters<T>);
  };
}

/**
 * Creates a Promise that always resolves to a specific value.
 * Useful for mocking async functions or providing default values.
 */
export function createResolvedPromise<T>(value: T): () => Promise<T> {
  return () => Promise.resolve(value);
}
