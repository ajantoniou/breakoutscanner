/**
 * Convert a function returning Promise<boolean> to Promise<void>
 */
export const adaptBooleanToVoidPromise = <T extends any[]>(
  func: (...args: T) => Promise<boolean>
): ((...args: T) => Promise<void>) => {
  return async (...args: T): Promise<void> => {
    await func(...args);
  };
};

/**
 * Convert a void function to one returning a boolean
 */
export const adaptVoidToBooleanFunction = <T extends any[]>(
  func: (...args: T) => void
): ((...args: T) => boolean) => {
  return (...args: T): boolean => {
    func(...args);
    return true;
  };
};

/**
 * Convert a boolean-returning synchronous function to a Promise<void> function
 */
export const adaptBooleanToVoidFunction = <T extends any[]>(
  func: (...args: T) => boolean
): ((...args: T) => Promise<void>) => {
  return async (...args: T): Promise<void> => {
    func(...args);
  };
};

/**
 * Convert a void function to one returning a Promise<boolean>
 */
export const adaptVoidToBooleanPromise = <T extends any[]>(
  func: (...args: T) => void
): ((...args: T) => Promise<boolean>) => {
  return async (...args: T): Promise<boolean> => {
    func(...args);
    return true;
  };
};

/**
 * Adapt a function to accept extra parameters that will be ignored
 */
export const adaptWithExtraArgs = <T extends any[], R>(
  func: (...args: T) => R
): ((...args: any[]) => R) => {
  return (...args: any[]): R => {
    // Extract just the parameters needed by the original function
    const neededArgs = args.slice(0, func.length) as unknown as T;
    return func(...neededArgs);
  };
};

/**
 * Adapt a function to work with additional parameters
 */
export const adaptWithAdditionalArgs = <T extends any[], R, U extends any[]>(
  func: (...args: T) => R,
  additionalArgsHandler?: (...extraArgs: U) => void
): ((...args: [...T, ...U]) => R) => {
  return (...args: [...T, ...U]): R => {
    // Split the arguments into two parts
    const originalArgs = args.slice(0, func.length) as unknown as T;
    
    // Handle additional arguments if a handler is provided
    if (additionalArgsHandler) {
      const additionalArgs = args.slice(func.length) as unknown as U;
      additionalArgsHandler(...additionalArgs);
    }
    
    return func(...originalArgs);
  };
};

/**
 * Provides a default function adapter for functions with inconsistent signatures
 */
export const adaptFunctionSignature = <T extends any[], R, U extends any[], S>(
  func: (...args: T) => R,
  adapter: (result: R) => S
): ((...args: U) => S) => {
  return (...args: U): S => {
    // Cast args to the expected type - this is unsafe but necessary in some cases
    const castedArgs = args as unknown as T;
    const result = func(...castedArgs);
    return adapter(result);
  };
};

/**
 * Adapts a function to handle toast notifications consistently regardless of arguments
 */
export const adaptToastFunction = <T extends (...args: any[]) => void>(
  func: T
): (title: string, description?: string) => void => {
  return (title: string, description?: string): void => {
    // Handle different function signatures based on parameter count
    switch (func.length) {
      case 1:
        func(title);
        break;
      case 2:
        if (description !== undefined) {
          func(title, description);
        } else {
          func(title);
        }
        break;
      case 3:
        if (description !== undefined) {
          func(title, { description });
        } else {
          func(title);
        }
        break;
      default:
        func(title);
    }
  };
};
