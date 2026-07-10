// Vendored from cnfast@0.0.8 (https://github.com/aidenybai/cnfast), MIT-licensed.
// Adapts clsx (Luke Edwards) + tailwind-merge (Dany Castillo). Do NOT hand-edit except
// the marked "mantle override" sections; excluded from oxlint/oxfmt. See ../README.md for sync steps.

import type { AnyConfig } from "./types.js";

/**
 * Sorts modifiers according to following schema:
 * - Predefined modifiers are sorted alphabetically
 * - When an arbitrary variant appears, it must be preserved which modifiers are before and after it
 */
export const createSortModifiers = (config: AnyConfig) => {
  const orderSensitiveModifiers = new Set(config.orderSensitiveModifiers);

  return (modifiers: readonly string[]): string[] => {
    const result: string[] = [];
    let currentSegment: string[] = [];

    for (let index = 0; index < modifiers.length; index++) {
      const modifier = modifiers[index]!;

      const isArbitrary = modifier[0] === "[";
      const isOrderSensitive = orderSensitiveModifiers.has(modifier);

      if (isArbitrary || isOrderSensitive) {
        if (currentSegment.length > 0) {
          currentSegment.sort();
          for (let segmentIndex = 0; segmentIndex < currentSegment.length; segmentIndex++) {
            result.push(currentSegment[segmentIndex]!);
          }
          currentSegment = [];
        }
        result.push(modifier);
      } else {
        currentSegment.push(modifier);
      }
    }

    if (currentSegment.length > 0) {
      currentSegment.sort();
      for (let segmentIndex = 0; segmentIndex < currentSegment.length; segmentIndex++) {
        result.push(currentSegment[segmentIndex]!);
      }
    }

    return result;
  };
};
