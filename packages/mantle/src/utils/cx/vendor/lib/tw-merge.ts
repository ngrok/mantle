// Vendored from cnfast@0.0.8 (https://github.com/aidenybai/cnfast), MIT-licensed.
// Adapts clsx (Luke Edwards) + tailwind-merge (Dany Castillo). Do NOT hand-edit except
// the marked "mantle override" sections; excluded from oxlint/oxfmt. See ../README.md for sync steps.

import { createTailwindMerge } from "./create-tailwind-merge.js";
import { getDefaultConfig } from "./default-config.js";

export const twMerge = createTailwindMerge(getDefaultConfig);
