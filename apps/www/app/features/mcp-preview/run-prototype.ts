import type { ComponentType } from "react";
import { transform } from "sucrase";
import { loadPreviewModule } from "./module-registry";

/** The result of {@link runPrototype}. */
export type RunPrototypeResult =
	| { ok: true; Component: ComponentType }
	| { ok: false; title: string; message: string };

const requirePattern = /\brequire\(\s*(["'])([^"']+)\1\s*\)/g;

// Why a function check only: React reports any other component problem when it renders.
function isComponent(value: unknown): value is ComponentType {
	return typeof value === "function";
}

function failure(title: string, error: unknown): RunPrototypeResult {
	return { ok: false, title, message: error instanceof Error ? error.message : String(error) };
}

function compile(source: string): { ok: true; code: string } | { ok: false; error: unknown } {
	try {
		const { code } = transform(source, {
			transforms: ["typescript", "jsx", "imports"],
			jsxRuntime: "automatic",
			production: true,
			filePath: "prototype.tsx",
		});
		return { ok: true, code };
	} catch (error) {
		return { ok: false, error };
	}
}

/**
 * Compiles a TSX prototype to CommonJS, loads each module it imports, and
 * runs it. Returns the default export as a component, or the error to show.
 *
 * Only the modules in the preview registry resolve. Any other import returns
 * an error that names it, before the prototype runs.
 *
 * @example
 * const result = await runPrototype(`export default function App() { return <p>Hi</p>; }`);
 * if (result.ok) {
 *   root.render(<result.Component />);
 * }
 */
export async function runPrototype(source: string): Promise<RunPrototypeResult> {
	const compiled = compile(source);
	if (!compiled.ok) {
		return failure("The code does not compile", compiled.error);
	}
	const { code } = compiled;

	const specifiers = new Set(Array.from(code.matchAll(requirePattern), (match) => match[2] ?? ""));
	const modules: Map<string, unknown> = new Map();
	for (const specifier of specifiers) {
		// Why one at a time: the first unknown import stops the run, and each load is a cached chunk.
		const loaded = await loadPreviewModule(specifier);
		if (loaded == null) {
			return {
				ok: false,
				title: "The code imports a module the preview cannot load",
				message: `\`${specifier}\` is not available. A prototype can import react, react-dom, @ngrok/mantle/*, and @phosphor-icons/react.`,
			};
		}
		modules.set(specifier, loaded);
	}

	const module: { exports: Record<string, unknown> } = { exports: {} };
	const require = (specifier: string) => {
		if (!modules.has(specifier)) {
			throw new Error(`\`${specifier}\` is not available in the preview.`);
		}
		return modules.get(specifier);
	};
	try {
		// oxlint-disable-next-line typescript/no-implied-eval -- Why: the preview runs the user's compiled prototype; the frame is a sandboxed opaque origin with no network.
		new Function("require", "exports", "module", code)(require, module.exports, module);
	} catch (error) {
		return failure("The code throws when it loads", error);
	}

	const Component = module.exports.default;
	if (!isComponent(Component)) {
		return {
			ok: false,
			title: "The code has no default export",
			message: "Export the screen as the default export: `export default function App() { … }`.",
		};
	}
	return { ok: true, Component };
}
