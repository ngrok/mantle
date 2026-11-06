import type { PackageFiles } from "~/utilities/mcp/npm-tarball.server";

/** Builds an uncompressed `ustar` archive under `package/`, as npm packs one. */
export function tarOf(entries: Record<string, string>): Uint8Array {
	const encoder = new TextEncoder();
	const blocks: Uint8Array[] = [];
	for (const [path, content] of Object.entries(entries)) {
		const body = encoder.encode(content);
		const header = new Uint8Array(512);
		header.set(encoder.encode(path.startsWith("/") ? path : `package/${path}`).subarray(0, 100), 0);
		header.set(encoder.encode(`${body.length.toString(8).padStart(11, "0")}\0`), 124);
		header.set(encoder.encode("0"), 156);
		header.set(encoder.encode("ustar\0"), 257);
		blocks.push(header, body, new Uint8Array((512 - (body.length % 512)) % 512));
	}
	blocks.push(new Uint8Array(1024));
	return Buffer.concat(blocks);
}

/**
 * The API data files of a small published version, in the shape tsdown emits:
 * an entry declaration that re-exports from a hashed chunk, a compound
 * component, a subpath that re-exports another package, and a utility module.
 */
export function packageFilesFixture(version = "0.93.0"): PackageFiles {
	const origin = "https://mantle.ngrok.com";
	const manifest = {
		name: "@ngrok/mantle",
		version,
		origin,
		endpoints: {},
		subpaths: [
			"@ngrok/mantle/button",
			"@ngrok/mantle/dialog",
			"@ngrok/mantle/data-table",
			"@ngrok/mantle/hooks",
			"@ngrok/mantle/color",
		],
		components: [
			{
				name: "Button",
				slug: "components/actions/button",
				kind: "component",
				category: "Actions",
				status: "stable",
				importPath: "@ngrok/mantle/button",
				docsUrl: `${origin}/components/actions/button`,
				markdownUrl: `${origin}/components/actions/button.md`,
				summary: "Starts an action.",
				examples: ['<Button intent="neutral">Save</Button>'],
			},
			{
				name: "Dialog",
				slug: "components/overlays/dialog",
				kind: "component",
				category: "Overlays",
				status: "stable",
				importPath: "@ngrok/mantle/dialog",
				docsUrl: `${origin}/components/overlays/dialog`,
				markdownUrl: `${origin}/components/overlays/dialog.md`,
				summary: "A window over the page.",
				aliases: ["modal"],
				useWhen: "The user must confirm before a destructive action.",
			},
			{
				name: "Data Table",
				slug: "components/data-display/data-table",
				kind: "component",
				category: "Data Display",
				status: "stable",
				importPath: "@ngrok/mantle/data-table",
				docsUrl: `${origin}/components/data-display/data-table`,
				markdownUrl: `${origin}/components/data-display/data-table.md`,
				summary: "Rows of data with sorting.",
			},
		],
		hooks: [
			{
				name: "useBreakpoint",
				importPath: "@ngrok/mantle/hooks",
				docsUrl: `${origin}/hooks`,
				markdownUrl: `${origin}/hooks.md`,
				summary: "Reads the current breakpoint.",
			},
		],
		utilities: [
			{
				name: "color",
				importPath: "@ngrok/mantle/color",
				docsUrl: `${origin}/utils/color`,
				markdownUrl: `${origin}/utils/color.md`,
				summary: "Color names and type guards.",
			},
		],
	};
	return new Map([
		[
			"package.json",
			JSON.stringify({
				name: "@ngrok/mantle",
				version,
				exports: {
					"./mantle.css": "./dist/mantle.css",
					"./button": "./dist/button.js",
					"./dialog": "./dist/dialog.js",
					"./data-table": "./dist/data-table.js",
					"./hooks": "./dist/hooks.js",
					"./color": "./dist/color.js",
				},
			}),
		],
		["dist/agent.json", JSON.stringify(manifest)],
		["dist/llms.txt", "# @ngrok/mantle\n"],
		[
			"dist/button.d.ts",
			'import { n as ButtonProps, t as Button } from "./button-AbC123.js";\nexport { Button, type ButtonProps };\n',
		],
		[
			"dist/button-AbC123.d.ts",
			[
				"/** The props of `Button`. */",
				'type ButtonProps = { intent: "neutral" | "danger" };',
				"/** Starts an action. */",
				"declare const Button: (props: ButtonProps) => unknown;",
				"export { ButtonProps as n, Button as t };",
				"",
			].join("\n"),
		],
		["dist/dialog.d.ts", 'export * from "./dialog-Xyz.js";\n'],
		[
			"dist/dialog-Xyz.d.ts",
			[
				"/** The props of `Content`. */",
				"type ContentProps = { title: string };",
				"declare function Content(props: ContentProps): unknown;",
				"declare const Dialog: { readonly Root: unknown; readonly Content: typeof Content };",
				"export { Dialog };",
				"",
			].join("\n"),
		],
		[
			"dist/data-table.d.ts",
			'export * from "@tanstack/react-table";\nexport declare const DataTable: unknown;\n',
		],
		["dist/hooks.d.ts", "export declare function useBreakpoint(): string;\n"],
		["dist/color.d.ts", "export declare const colors: readonly string[];\n"],
	]);
}
