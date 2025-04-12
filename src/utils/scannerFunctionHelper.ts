
/**
 * Converts any function to return a Promise<boolean>
 * This is useful for adapting async functions to a consistent interface
 */
export function toBooleanPromise<T extends (...args: any[]) => any>(fn: T): () => Promise<boolean> {
  return async () => {
    try {
      const result = await fn();
      return true;
    } catch (error) {
      console.error("Error in function:", error);
      return false;
    }
  };
}

/**
 * Wraps a function that takes parameters to return a Promise<boolean>
 * This is useful for adapting functions with parameters to a unified interface
 */
export function wrapAsPromiseBoolean<T extends (...args: any[]) => any>(
  fn: T, 
  ...args: Parameters<T>
): () => Promise<boolean> {
  return async () => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      console.error("Error in function with args:", error);
      return false;
    }
  };
}

/**
 * Converts any function to return a boolean
 * This is useful for adapting synchronous functions
 */
export function toBoolean<T extends (...args: any[]) => any>(fn: T): () => boolean {
  return () => {
    try {
      fn();
      return true;
    } catch (error) {
      console.error("Error in function:", error);
      return false;
    }
  };
}

/**
 * Ensures that a function with parameters can be called with no parameters
 * and still return a boolean value
 */
export function withDefaultParams<T extends (...args: any[]) => any>(
  fn: T, 
  defaultParams: Parameters<T>
): () => boolean {
  return () => {
    try {
      fn(...defaultParams);
      return true;
    } catch (error) {
      console.error("Error in function with default params:", error);
      return false;
    }
  };
}

/**
 * Creates a no-op function that always returns true
 */
export function createNoopTrue(): () => boolean {
  return () => true;
}

/**
 * Adapts a function that returns void to return a boolean
 */
export function adaptVoidToBoolean(fn: () => void): () => boolean {
  return () => {
    try {
      fn();
      return true;
    } catch (error) {
      console.error("Error in void function:", error);
      return false;
    }
  };
}

/**
 * Adapts a function that returns a Promise<void> to return a Promise<boolean>
 */
export function adaptPromiseVoidToBoolean(fn: () => Promise<void>): () => Promise<boolean> {
  return async () => {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error("Error in promise void function:", error);
      return false;
    }
  };
}

/**
 * Adapts a function with parameters that returns Promise<void> to a parameterless function that returns Promise<boolean>
 */
export function adaptParameterizedPromiseVoidToBoolean<T extends (...args: any[]) => Promise<void>>(
  fn: T,
  ...args: Parameters<T>
): () => Promise<boolean> {
  return async () => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      console.error("Error in parameterized promise void function:", error);
      return false;
    }
  };
}
