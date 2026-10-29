/**
 * The modules a preview prototype can import, keyed by import specifier. Each
 * entry loads on first use, so a prototype pays only for what it imports.
 * `module-registry.test.ts` pins the mantle keys to the package `exports`.
 */
export const previewModules: Readonly<Record<string, () => Promise<unknown>>> = {
	//,
	react: () => import("react"),
	"react/jsx-runtime": () => import("react/jsx-runtime"),
	"react-dom": () => import("react-dom"),
	"@ngrok/mantle/accordion": () => import("@ngrok/mantle/accordion"),
	"@ngrok/mantle/alert": () => import("@ngrok/mantle/alert"),
	"@ngrok/mantle/alert-center": () => import("@ngrok/mantle/alert-center"),
	"@ngrok/mantle/alert-dialog": () => import("@ngrok/mantle/alert-dialog"),
	"@ngrok/mantle/anchor": () => import("@ngrok/mantle/anchor"),
	"@ngrok/mantle/app-layout": () => import("@ngrok/mantle/app-layout"),
	"@ngrok/mantle/area-chart": () => import("@ngrok/mantle/area-chart"),
	"@ngrok/mantle/avatar": () => import("@ngrok/mantle/avatar"),
	"@ngrok/mantle/badge": () => import("@ngrok/mantle/badge"),
	"@ngrok/mantle/bar-chart": () => import("@ngrok/mantle/bar-chart"),
	"@ngrok/mantle/breadcrumb": () => import("@ngrok/mantle/breadcrumb"),
	"@ngrok/mantle/browser-only": () => import("@ngrok/mantle/browser-only"),
	"@ngrok/mantle/button": () => import("@ngrok/mantle/button"),
	"@ngrok/mantle/calendar": () => import("@ngrok/mantle/calendar"),
	"@ngrok/mantle/card": () => import("@ngrok/mantle/card"),
	"@ngrok/mantle/centered-layout": () => import("@ngrok/mantle/centered-layout"),
	"@ngrok/mantle/checkbox": () => import("@ngrok/mantle/checkbox"),
	"@ngrok/mantle/choice": () => import("@ngrok/mantle/choice"),
	"@ngrok/mantle/code": () => import("@ngrok/mantle/code"),
	"@ngrok/mantle/code-block": () => import("@ngrok/mantle/code-block"),
	"@ngrok/mantle/highlight-utils": () => import("@ngrok/mantle/highlight-utils"),
	"@ngrok/mantle/color": () => import("@ngrok/mantle/color"),
	"@ngrok/mantle/combobox": () => import("@ngrok/mantle/combobox"),
	"@ngrok/mantle/command": () => import("@ngrok/mantle/command"),
	"@ngrok/mantle/cx": () => import("@ngrok/mantle/cx"),
	"@ngrok/mantle/data-table": () => import("@ngrok/mantle/data-table"),
	"@ngrok/mantle/description-list": () => import("@ngrok/mantle/description-list"),
	"@ngrok/mantle/dialog": () => import("@ngrok/mantle/dialog"),
	"@ngrok/mantle/dropdown-menu": () => import("@ngrok/mantle/dropdown-menu"),
	"@ngrok/mantle/empty": () => import("@ngrok/mantle/empty"),
	"@ngrok/mantle/field": () => import("@ngrok/mantle/field"),
	"@ngrok/mantle/flag": () => import("@ngrok/mantle/flag"),
	"@ngrok/mantle/hooks": () => import("@ngrok/mantle/hooks"),
	"@ngrok/mantle/hover-card": () => import("@ngrok/mantle/hover-card"),
	"@ngrok/mantle/icon": () => import("@ngrok/mantle/icon"),
	"@ngrok/mantle/icons": () => import("@ngrok/mantle/icons"),
	"@ngrok/mantle/input": () => import("@ngrok/mantle/input"),
	"@ngrok/mantle/kbd": () => import("@ngrok/mantle/kbd"),
	"@ngrok/mantle/label": () => import("@ngrok/mantle/label"),
	"@ngrok/mantle/line-chart": () => import("@ngrok/mantle/line-chart"),
	"@ngrok/mantle/list": () => import("@ngrok/mantle/list"),
	"@ngrok/mantle/live-region": () => import("@ngrok/mantle/live-region"),
	"@ngrok/mantle/main": () => import("@ngrok/mantle/main"),
	"@ngrok/mantle/media-object": () => import("@ngrok/mantle/media-object"),
	"@ngrok/mantle/multi-select": () => import("@ngrok/mantle/multi-select"),
	"@ngrok/mantle/otp-input": () => import("@ngrok/mantle/otp-input"),
	"@ngrok/mantle/pagination": () => import("@ngrok/mantle/pagination"),
	"@ngrok/mantle/popover": () => import("@ngrok/mantle/popover"),
	"@ngrok/mantle/progress": () => import("@ngrok/mantle/progress"),
	"@ngrok/mantle/qr-code": () => import("@ngrok/mantle/qr-code"),
	"@ngrok/mantle/query": () => import("@ngrok/mantle/query"),
	"@ngrok/mantle/query-filter": () => import("@ngrok/mantle/query-filter"),
	"@ngrok/mantle/radio-group": () => import("@ngrok/mantle/radio-group"),
	"@ngrok/mantle/sandbar": () => import("@ngrok/mantle/sandbar"),
	"@ngrok/mantle/sandboxed-on-click": () => import("@ngrok/mantle/sandboxed-on-click"),
	"@ngrok/mantle/scatter-plot": () => import("@ngrok/mantle/scatter-plot"),
	"@ngrok/mantle/select": () => import("@ngrok/mantle/select"),
	"@ngrok/mantle/selectable-list": () => import("@ngrok/mantle/selectable-list"),
	"@ngrok/mantle/separator": () => import("@ngrok/mantle/separator"),
	"@ngrok/mantle/sheet": () => import("@ngrok/mantle/sheet"),
	"@ngrok/mantle/sidebar": () => import("@ngrok/mantle/sidebar"),
	"@ngrok/mantle/skeleton": () => import("@ngrok/mantle/skeleton"),
	"@ngrok/mantle/skip-to-main-link": () => import("@ngrok/mantle/skip-to-main-link"),
	"@ngrok/mantle/slider": () => import("@ngrok/mantle/slider"),
	"@ngrok/mantle/slot": () => import("@ngrok/mantle/slot"),
	"@ngrok/mantle/split-button": () => import("@ngrok/mantle/split-button"),
	"@ngrok/mantle/strata": () => import("@ngrok/mantle/strata"),
	"@ngrok/mantle/switch": () => import("@ngrok/mantle/switch"),
	"@ngrok/mantle/table": () => import("@ngrok/mantle/table"),
	"@ngrok/mantle/tabs": () => import("@ngrok/mantle/tabs"),
	"@ngrok/mantle/text-area": () => import("@ngrok/mantle/text-area"),
	"@ngrok/mantle/theme": () => import("@ngrok/mantle/theme"),
	"@ngrok/mantle/theme-switcher": () => import("@ngrok/mantle/theme-switcher"),
	"@ngrok/mantle/toast": () => import("@ngrok/mantle/toast"),
	"@ngrok/mantle/tooltip": () => import("@ngrok/mantle/tooltip"),
	"@ngrok/mantle/truncated-text": () => import("@ngrok/mantle/truncated-text"),
	"@ngrok/mantle/types": () => import("@ngrok/mantle/types"),
	"@ngrok/mantle/utils": () => import("@ngrok/mantle/utils"),
	"@ngrok/mantle/visually-hidden": () => import("@ngrok/mantle/visually-hidden"),
	"@ngrok/mantle/well": () => import("@ngrok/mantle/well"),
};

const phosphorPackage = "@phosphor-icons/react";

/**
 * Loads the module for one import specifier, or returns `null` when a
 * prototype cannot import it. Phosphor icons load from the package barrel:
 * a prototype imports icons the way an app does (`@phosphor-icons/react/Trash`),
 * and one barrel chunk serves every icon.
 *
 * @example
 * await loadPreviewModule("@ngrok/mantle/button"); // => the button module
 * await loadPreviewModule("lodash"); // => null
 */
export async function loadPreviewModule(specifier: string): Promise<unknown> {
	const load = Object.hasOwn(previewModules, specifier) ? previewModules[specifier] : undefined;
	if (load != null) {
		return load();
	}
	if (specifier === phosphorPackage || specifier.startsWith(`${phosphorPackage}/`)) {
		// oxlint-disable-next-line mantle/no-barrel-imports -- Why: a prototype can import any of the 1,500 icons, so one lazy barrel chunk serves them all.
		return import("@phosphor-icons/react");
	}
	return null;
}
