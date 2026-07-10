// Vendored from cnfast@0.0.8 (https://github.com/aidenybai/cnfast), MIT-licensed.
// Adapts clsx (Luke Edwards) + tailwind-merge (Dany Castillo). Do NOT hand-edit except
// the marked "mantle override" sections; excluded from oxlint/oxfmt. See ../README.md for sync steps.

import type { DefaultThemeGroupIds, NoInfer, ThemeGetter, ThemeObject } from "./types.js";

const fallbackThemeArr: ThemeObject<DefaultThemeGroupIds>[DefaultThemeGroupIds] = [];

export const fromTheme = <
  AdditionalThemeGroupIds extends string = never,
  DefaultThemeGroupIdsInner extends string = DefaultThemeGroupIds,
>(
  key: NoInfer<DefaultThemeGroupIdsInner | AdditionalThemeGroupIds>,
): ThemeGetter => {
  const themeGetter = (theme: ThemeObject<DefaultThemeGroupIdsInner | AdditionalThemeGroupIds>) =>
    theme[key] || fallbackThemeArr;

  themeGetter.isThemeGetter = true as const;

  return themeGetter;
};
