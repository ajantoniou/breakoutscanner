
/**
 * Adapts a function that returns a boolean to one that returns void
 */
export function adaptBooleanToVoid<T extends any[]>(fn: (...args: T) => boolean): (...args: T) => void {
  return (...args: T): void => {
    fn(...args);
  };
}

/**
 * Adapts a function that returns a Promise<boolean> to one that returns Promise<void>
 */
export function adaptBooleanToVoidPromise<T extends any[]>(fn: (...args: T) => Promise<boolean>): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    await fn(...args);
  };
}

/**
 * Adapts a void function to one that returns a boolean
 */
export function adaptVoidToBooleanFunction<T extends any[]>(fn: (...args: T) => void): (...args: T) => boolean {
  return (...args: T): boolean => {
    try {
      fn(...args);
      return true;
    } catch (error) {
      console.error('Error in adapted function:', error);
      return false;
    }
  };
}

/**
 * Adapts a function that returns Promise<void> to one that returns Promise<boolean>
 */
export function adaptVoidToBooleanPromise<T extends any[]>(fn: (...args: T) => Promise<void>): (...args: T) => Promise<boolean> {
  return async (...args: T): Promise<boolean> => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      console.error('Error in adapted promise function:', error);
      return false;
    }
  };
}

/**
 * Adapts a function to work with extra arguments
 */
export function adaptWithExtraArgs<T, R>(fn: (...args: any[]) => R): (...args: any[]) => R {
  return (...args: any[]): R => {
    // Call the original function with the arguments it expects
    return fn.apply(null, args);
  };
}

/**
 * Adapt a function to use toast notifications
 */
export function adaptToastFunction<T extends any[]>(fn: (...args: T) => any, successMessage: string, errorMessage: string): (...args: T) => any {
  return (...args: T): any => {
    try {
      const result = fn(...args);
      console.log(successMessage);
      return result;
    } catch (error) {
      console.error(errorMessage, error);
      throw error;
    }
  };
}

/**
 * Convert a function that returns a Promise<boolean> to one that returns Promise<void>
 */
export function voidifyPromise<T extends any[]>(fn: (...args: T) => Promise<boolean>): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    await fn(...args);
  };
}
