import type { ComponentType } from "react";

type PageExampleModule = Record<string, unknown>;

/**
 * The examples module of each docs page: `app/docs/<page>.examples.tsx` sits
 * beside `<page>.mdx` and exports one `<Name>Example` component per example.
 * The glob is lazy, so a preview document loads only its own page's module.
 */
const pageExampleModules = import.meta.glob<PageExampleModule>("../docs/**/*.examples.tsx");

/**
 * Where a page example lives: its page's module and the export in it.
 */
export type PageExampleRef = {
	/** The module's glob key, such as `../docs/components/actions/button.examples.tsx`. */
	modulePath: string;
	/** The component export, such as `SizeExample`. */
	exportName: string;
};

/**
 * The export name for an example name: `size` is `SizeExample`, and
 * `with-icon` is `WithIconExample`.
 *
 * @example
 * ```ts
 * exampleExportName("with-icon"); // "WithIconExample"
 * ```
 */
export function exampleExportName(name: string): string {
	const pascal = name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
	return `${pascal}Example`;
}

/**
 * Parses a page example key, `<page path>/<example name>`, into its module and
 * export. Returns `null` when the key is malformed or the page has no examples
 * module. It does not load the module, so the export can still be missing.
 *
 * @example
 * ```ts
 * parsePageExampleKey("components/actions/button/size");
 * // { modulePath: "../docs/components/actions/button.examples.tsx", exportName: "SizeExample" }
 * ```
 */
export function parsePageExampleKey(key: string): PageExampleRef | null {
	const slash = key.lastIndexOf("/");
	const page = key.slice(0, slash);
	const name = key.slice(slash + 1);
	if (slash <= 0 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
		return null;
	}
	const modulePath = `../docs/${page}.examples.tsx`;
	if (!Object.hasOwn(pageExampleModules, modulePath)) {
		return null;
	}
	return { modulePath, exportName: exampleExportName(name) };
}

const loadedModules = new Map<string, Promise<PageExampleModule>>();

/**
 * Loads a page's examples module once and returns the same promise after that,
 * so a component can pass it to `use()` on each render.
 */
export function loadPageExampleModule(modulePath: string): Promise<PageExampleModule> {
	const loaded = loadedModules.get(modulePath);
	if (loaded != null) {
		return loaded;
	}
	const load = pageExampleModules[modulePath];
	if (load == null) {
		return Promise.reject(new Error(`No docs page examples module at ${modulePath}.`));
	}
	const promise = load();
	loadedModules.set(modulePath, promise);
	return promise;
}

/**
 * Whether a module export is a component.
 *
 * @example
 * ```ts
 * isComponentType(module.SizeExample); // true
 * ```
 */
export function isComponentType(value: unknown): value is ComponentType {
	return typeof value === "function";
}

/**
 * The example component a ref names, from its loaded module, or `null` when the
 * module has no such export.
 *
 * @example
 * ```ts
 * const module = await loadPageExampleModule(ref.modulePath);
 * const Example = pageExampleOf(module, ref.exportName);
 * ```
 */
export function pageExampleOf(module: PageExampleModule, exportName: string): ComponentType | null {
	const value = module[exportName];
	return isComponentType(value) ? value : null;
}
