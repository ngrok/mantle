// ⚠️ AUTO-GENERATED — do not edit by hand.
// Re-run `pnpm exec tsx scripts/generate-component-names.ts`
// or `pnpm run build` to regenerate after adding or removing mantle components.

/**
 * The known `@ngrok/mantle` component subpath names — the segment after
 * `@ngrok/mantle/` in an import specifier (e.g. `"button"` for
 * `@ngrok/mantle/button`).
 *
 * Derived from the kebab-case component directories in
 * `packages/mantle/src/components/`. This list only includes component
 * subpaths, not utility exports (e.g. `cx`, `hooks`, `color`). Higher-level
 * option handling (e.g. `allowlist`) also accepts PascalCase names (e.g.
 * `"AlertDialog"` → `"alert-dialog"`), but they are normalized to these
 * kebab-case subpaths before use.
 */
export const MANTLE_COMPONENT_NAMES = [
	"accordion",
	"alert",
	"alert-dialog",
	"anchor",
	"badge",
	"browser-only",
	"button",
	"calendar",
	"card",
	"checkbox",
	"code",
	"code-block",
	"combobox",
	"command",
	"data-table",
	"description-list",
	"dialog",
	"dropdown-menu",
	"empty",
	"flag",
	"hover-card",
	"icon",
	"icons",
	"input",
	"kbd",
	"label",
	"main",
	"media-object",
	"multi-select",
	"pagination",
	"popover",
	"progress",
	"radio-group",
	"sandboxed-on-click",
	"select",
	"separator",
	"sheet",
	"sidebar",
	"skeleton",
	"skip-to-main-link",
	"slider",
	"slot",
	"split-button",
	"switch",
	"table",
	"tabs",
	"text-area",
	"theme",
	"toast",
	"tooltip",
] as const;

/**
 * Union type of all known `@ngrok/mantle` component subpath names.
 * Derived from {@link MANTLE_COMPONENT_NAMES}.
 */
export type MantleComponentName = (typeof MANTLE_COMPONENT_NAMES)[number];
