
/**
 * Create a function that always returns a boolean value
 * This is useful for adapting existing functions to match interfaces
 * that expect a boolean return value
 */
export function createBooleanFunction(fn: (...args: any[]) => any): () => boolean {
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
 * Create an async function that always returns a Promise<boolean>
 */
export function createAsyncBooleanFunction<T extends (...args: any[]) => any>(
  fn: T
): () => Promise<boolean> {
  return async () => {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error("Error in async function:", error);
      return false;
    }
  };
}

/**
 * Wraps an existing function to ensure it returns a Promise<boolean>
 */
export function wrapAsBoolean<T extends (...args: any[]) => any>(
  fn: T
): () => Promise<boolean> {
  return async () => {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error("Error in wrapped function:", error);
      return false;
    }
  };
}
