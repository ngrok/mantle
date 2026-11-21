/**
 * Disallows the `@phosphor-icons/react` and `date-fns` barrel modules, and
 * requires the per-icon phosphor server build. Each barrel re-exports every
 * module in the package, so one import loads thousands of files in every
 * Vitest process and in dev SSR. The default per-icon build reads
 * `IconContext`, so a React Server Component cannot render it. Mantle and its
 * apps do not set an `IconContext`, so the server build renders the same SVG.
 * The compiler erases type imports, so they stay allowed on the barrels.
 *
 * @example
 * // ❌ Incorrect
 * import { CheckIcon } from "@phosphor-icons/react";
 * import { CheckIcon } from "@phosphor-icons/react/ssr";
 * import { CheckIcon } from "@phosphor-icons/react/Check";
 * import { Check } from "@phosphor-icons/react/dist/ssr/Check";
 * import { format } from "date-fns";
 *
 * // ✅ Correct
 * import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
 * import type { Icon } from "@phosphor-icons/react";
 * import { format } from "date-fns/format";
 * import type { Interval } from "date-fns";
 */

const PHOSPHOR = "@phosphor-icons/react";
const PHOSPHOR_SSR = `${PHOSPHOR}/dist/ssr`;
/** Matches one icon module of the phosphor server build, such as `@phosphor-icons/react/dist/ssr/Check`. */
const SERVER_ICON_RE = /^@phosphor-icons\/react\/dist\/ssr\/[A-Z]\w*$/;
const DATE_FNS = "date-fns";

const BARREL_MESSAGES = {
	[PHOSPHOR]: `Import one icon per module: \`import { CheckIcon } from "${PHOSPHOR_SSR}/Check"\`. The barrel loads ~3,000 modules. See CONVENTIONS.md § Files & Modules.`,
	[DATE_FNS]: `Import one function per module: \`import { format } from "${DATE_FNS}/format"\`. The barrel loads every function. See CONVENTIONS.md § Files & Modules.`,
};

const SERVER_BUILD_MESSAGE = `Import icons from "${PHOSPHOR_SSR}/<Icon>". The other phosphor builds read IconContext, so a React Server Component cannot render them.`;

const BARE_NAME_MESSAGE = "Use the `*Icon` export. The bare icon name is deprecated upstream.";

function isTypeSpecifier(specifier) {
	return specifier.importKind === "type" || specifier.exportKind === "type";
}

function isTypeOnly(node) {
	if (node.importKind === "type" || node.exportKind === "type") {
		return true;
	}
	const specifiers = node.specifiers ?? [];
	return specifiers.length > 0 && specifiers.every(isTypeSpecifier);
}

/** The binding a specifier takes from the source module: `imported` on an import, `local` on a re-export. */
function sourceBinding(specifier) {
	if (specifier.type === "ImportSpecifier") {
		return specifier.imported;
	}
	if (specifier.type === "ExportSpecifier") {
		return specifier.local;
	}
	return null;
}

const noBarrelImports = {
	meta: {},
	create(context) {
		function check(node) {
			const source = node.source?.value;
			if (typeof source !== "string") {
				return;
			}
			if (isTypeOnly(node)) {
				return;
			}
			const barrelMessage = BARREL_MESSAGES[source];
			if (barrelMessage) {
				context.report({ message: barrelMessage, node: node.source });
				return;
			}
			if (!source.startsWith(`${PHOSPHOR}/`)) {
				return;
			}
			if (!SERVER_ICON_RE.test(source)) {
				context.report({ message: SERVER_BUILD_MESSAGE, node: node.source });
				return;
			}
			for (const specifier of node.specifiers ?? []) {
				if (isTypeSpecifier(specifier)) {
					continue;
				}
				const binding = sourceBinding(specifier);
				if (binding?.type === "Identifier" && !binding.name.endsWith("Icon")) {
					context.report({ message: BARE_NAME_MESSAGE, node: specifier });
				}
			}
		}

		return {
			ImportDeclaration: check,
			ExportAllDeclaration: check,
			ExportNamedDeclaration: check,
		};
	},
};

const plugin = {
	meta: { name: "mantle" },
	rules: {
		"no-barrel-imports": noBarrelImports,
	},
};

export default plugin;
