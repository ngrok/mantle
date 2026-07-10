// Vendored from cnfast@0.0.8 (https://github.com/aidenybai/cnfast), MIT-licensed.
// Adapts clsx (Luke Edwards) + tailwind-merge (Dany Castillo). Do NOT hand-edit except
// the marked "mantle override" sections; excluded from oxlint/oxfmt. See ./README.md for sync steps.

export interface ClassDictionary {
  // Mirrors clsx's `Record<string, any>`: `unknown` here would reject render-function
  // classNames (e.g. Base UI / Radix `className={(state) => ...}`) that structurally
  // satisfy `any` but not an `unknown`-valued index signature, breaking drop-in parity.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional clsx type parity
  [className: string]: any;
}

export type ClassValue =
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ClassValue[]
  | ClassDictionary;

// Hoist the global builtin to a module-scope binding (oveo "hoist globals"): turns a
// repeated global-object property load into a plain variable load on the join hot path.
const isArray = Array.isArray;

// Exported for `cn`, which passes its collected rest-args array straight in to avoid
// a second spread + array allocation that `clsx(...inputs)` would incur per call.
export const resolveClassValue = (value: ClassValue): string => {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (typeof value === "number") return "" + value;

  let result = "";

  if (isArray(value)) {
    const length = value.length;
    for (let index = 0; index < length; index++) {
      const item = value[index];
      // Skip falsy items (null/false/undefined/0/"") without a recursive call, and take the
      // string fast path directly: most arguments to `cn`/`clsx` are plain class strings.
      if (!item) continue;
      const resolved = typeof item === "string" ? item : resolveClassValue(item);
      if (resolved) {
        if (result) result += " ";
        result += resolved;
      }
    }
    return result;
  }

  if (typeof value === "object") {
    for (const key in value) {
      if (value[key]) {
        if (result) result += " ";
        result += key;
      }
    }
  }

  return result;
};

export const clsx = (...inputs: ClassValue[]): string => resolveClassValue(inputs);
