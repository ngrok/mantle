import { describe, expect, it } from "vitest";
import { checkCode } from "~/utilities/mcp/check.server";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

const data = versionDataFromFiles("0.93.0", packageFilesFixture());

/**
 * The fixture plus parts in the shapes tsdown emits: a compound that is
 * `typeof <Name>Parts`, a part that wraps an aliased chunk import, a part
 * whose props come from another package, and cva variants.
 */
function partsFiles() {
	const files = new Map(packageFilesFixture());
	const packageJson = JSON.parse(files.get("package.json") ?? "{}") as {
		exports: Record<string, string>;
	};
	packageJson.exports["./sheet"] = "./dist/sheet.js";
	packageJson.exports["./icon-button"] = "./dist/icon-button.js";
	files.set("package.json", JSON.stringify(packageJson));
	files.set(
		"dist/sheet.d.ts",
		'import * as SheetParts from "./sheet-parts.js";\ndeclare const Sheet: typeof SheetParts;\nexport { Sheet };\n',
	);
	files.set(
		"dist/sheet-parts.d.ts",
		'import { a as Root, b as Content, c as Title, d as Trigger } from "./sheet-Q1.js";\nexport { Content, Root, Title, Trigger };\n',
	);
	files.set(
		"dist/sheet-Q1.d.ts",
		[
			'import { ComponentProps, ReactNode } from "react";',
			'import * as Primitive from "@radix-ui/react-dialog";',
			'import { s as Title$1 } from "./sheet-P0.js";',
			"declare const Root: (props: { children: ReactNode; open?: boolean }) => unknown;",
			'type ContentProps = Omit<ComponentProps<"div">, "title"> & { preferredWidth?: string };',
			"declare const Content: ({ preferredWidth, ...props }: ContentProps) => unknown;",
			"declare const Title: (props: ComponentProps<typeof Title$1>) => unknown;",
			"declare const Trigger: (props: ComponentProps<typeof Primitive.Trigger>) => unknown;",
			"export { Root as a, Content as b, Title as c, Trigger as d };",
		].join("\n"),
	);
	files.set(
		"dist/sheet-P0.d.ts",
		'import { ComponentProps } from "react";\ndeclare const Title: (props: ComponentProps<"h2">) => unknown;\nexport { Title as s };\n',
	);
	files.set(
		"dist/icon-button.d.ts",
		[
			'import { ComponentProps, ReactNode } from "react";',
			'declare const iconButtonVariants: (props?: ({ size?: "sm" | "md" | null } & import("class-variance-authority/types").ClassProp) | undefined) => string;',
			'type IconButtonProps = Omit<ComponentProps<"button">, "aria-label" | "children"> & VariantProps<typeof iconButtonVariants> & { "aria-label"?: never; label: string; icon: ReactNode };',
			"declare const IconButton: (props: IconButtonProps) => unknown;",
			"export { IconButton };",
		].join("\n"),
	);
	return files;
}

const parts = versionDataFromFiles("0.93.0", partsFiles());
const SHEET = 'import { Sheet } from "@ngrok/mantle/sheet";\n';
const partsOf = (code: string, docsWords?: ReadonlySet<string>) =>
	checkCode({ code, data: parts, docsWordsOf: () => docsWords }).map(({ code, message, fix }) => ({
		code,
		message,
		fix,
	}));

const codesOf = (code: string) => checkCode({ code, data }).map((diagnostic) => diagnostic.code);

describe("checkCode", () => {
	it("passes code that imports real names from real subpaths and composes with cx", () => {
		const code = [
			'import { Button, type ButtonProps } from "@ngrok/mantle/button";',
			'import "@ngrok/mantle/mantle.css";',
			'export default () => <Button intent="neutral" className="w-full">Save</Button>;',
		].join("\n");

		expect(checkCode({ code, data })).toEqual([]);
	});

	it("names the subpath that exports a name imported from the package root", () => {
		const [diagnostic] = checkCode({ code: 'import { Button } from "@ngrok/mantle";', data });

		expect(diagnostic?.code).toBe("unknown-subpath");
		expect(diagnostic?.fix).toBe("Import Button from @ngrok/mantle/button.");
	});

	it("reports a name the subpath does not export, at its own position", () => {
		const [diagnostic] = checkCode({
			code: 'import { Dialog } from "@ngrok/mantle/button";',
			data,
		});

		expect(diagnostic).toMatchObject({
			code: "unknown-export",
			line: 1,
			column: 10,
			fix: "Import Dialog from @ngrok/mantle/dialog.",
		});
	});

	it("reports foreign UI libraries, clsx, and local imports", () => {
		const code = [
			'import * as Dialog from "@radix-ui/react-dialog";',
			'import { Button } from "@/components/ui/button";',
			'import clsx from "clsx";',
			'import { thing } from "./thing";',
		].join("\n");

		expect(codesOf(code)).toEqual([
			"foreign-ui-library",
			"foreign-ui-library",
			"clsx-classnames",
			"incomplete-context",
		]);
	});

	it("reports a default import from a subpath with no default export", () => {
		const [diagnostic] = checkCode({ code: 'import Button from "@ngrok/mantle/button";', data });

		expect(diagnostic).toMatchObject({ code: "unknown-export", severity: "error" });
	});

	it("reports a stylesheet path that the version does not export", () => {
		expect(codesOf('import "@ngrok/mantle/mantle-dark.css";')).toEqual(["unknown-subpath"]);
		expect(codesOf('import cssUrl from "@ngrok/mantle/mantle.css?url";')).toEqual([]);
	});

	it("does not call a name invalid when the subpath re-exports another package", () => {
		const diagnostics = checkCode({
			code: 'import { DataTable, useTable } from "@ngrok/mantle/data-table";',
			data,
		});

		expect(diagnostics).toMatchObject([{ code: "incomplete-context", severity: "info" }]);
		expect(codesOf('import DataTable from "@ngrok/mantle/data-table";')).toEqual([
			"unknown-export",
		]);
	});

	it("requires a default export when the caller asks for one", () => {
		const code = "export const App = () => null;";

		expect(codesOf(code)).toEqual([]);
		expect(
			checkCode({ code, data, requireDefaultExport: true }).map((diagnostic) => diagnostic.code),
		).toEqual(["missing-default-export"]);
	});

	it("reports className built with a template, a ternary, or plus", () => {
		const code = [
			"const a = <div className={`p-2 ${x}`} />;",
			'const b = <div className={x ? "a" : "b"} />;',
			'const c = <div className={"a " + x} />;',
			"const d = <div className={`p-2`} />;",
		].join("\n");

		expect(checkCode({ code, data }).map((diagnostic) => diagnostic.line)).toEqual([1, 2, 3]);
	});

	it("reports a parse error and stops", () => {
		expect(codesOf("export default () => <div>")).toEqual(["parse-error"]);
	});

	it("reports a prop the version lacks, with a near name or a note that only the docs have it", () => {
		const code = `${SHEET}<Sheet.Root><Sheet.Content aria-label="Edit" preferredWidht="sm" keyboardShortcut /></Sheet.Root>;`;

		expect(partsOf(code, new Set(["keyboardShortcut"]))).toEqual([
			{
				code: "unknown-prop",
				message: "Sheet.Content has no prop preferredWidht in @ngrok/mantle@0.93.0.",
				fix: "Did you mean preferredWidth? Call `get` with Sheet for its props.",
			},
			{
				code: "unknown-prop",
				message: "Sheet.Content has no prop keyboardShortcut in @ngrok/mantle@0.93.0.",
				fix: "The docs show keyboardShortcut, but no release has it yet. Remove it.",
			},
		]);
	});

	it("reports forbidden and missing props, and leaves required props to a spread", () => {
		const iconButton = 'import { IconButton } from "@ngrok/mantle/icon-button";\n';

		expect(
			partsOf(
				`${iconButton}<IconButton aria-label="Close" size="sm" tone="muted" data-testid="x" />;`,
			),
		).toEqual([
			{
				code: "missing-prop",
				message: "IconButton requires label, icon.",
				fix: "Call `get` with IconButton for the type of each.",
			},
			{
				code: "forbidden-prop",
				message: "IconButton does not take aria-label.",
				fix: "Did you mean label? Call `get` with IconButton for its props.",
			},
			{
				code: "unknown-prop",
				message: "IconButton has no prop tone in @ngrok/mantle@0.93.0.",
				fix: "Call `get` with IconButton for its props.",
			},
		]);
		expect(partsOf(`${iconButton}(props) => <IconButton {...props} />;`)).toEqual([]);
		expect(
			partsOf(`${SHEET}<Sheet.Root><Sheet.Title>T<Sheet.Trigger /></Sheet.Title></Sheet.Root>;`),
		).toEqual([]);
		expect(partsOf(`${iconButton}<IconButton label="Close" icon={null}>x</IconButton>;`)).toEqual([
			{
				code: "forbidden-prop",
				message: "IconButton does not take children.",
				fix: "Make it self-closing, or call `get` with IconButton for its props.",
			},
		]);
		expect(
			partsOf(`${SHEET}<Sheet.Root><Sheet.Content title="x" aria-label="y" /></Sheet.Root>;`),
		).toMatchObject([{ code: "forbidden-prop", message: "Sheet.Content does not take title." }]);
	});

	it("judges props through chunk aliases, but not props from another package", () => {
		expect(
			partsOf(`${SHEET}<Sheet.Root><Sheet.Title level={2}>t</Sheet.Title></Sheet.Root>;`),
		).toMatchObject([{ code: "unknown-prop", message: expect.stringContaining("level") }]);
		expect(
			partsOf(`${SHEET}<Sheet.Root><Sheet.Trigger asChild anything="1" /></Sheet.Root>;`),
		).toEqual([]);
	});

	it("names the parts a compound has when the code uses another", () => {
		expect(partsOf(`${SHEET}<Sheet.Root><Sheet.Contnet /></Sheet.Root>;`)).toEqual([
			{
				code: "unknown-part",
				message: "Sheet has no part Contnet in @ngrok/mantle@0.93.0.",
				fix: "Use one of: Content, Root, Title, Trigger.",
			},
		]);
	});

	it("ignores a DOM tag or a local component that shares a name with an import", () => {
		const intrinsic = `import { IconButton as button } from "@ngrok/mantle/icon-button";\n<button aria-label="Save" />;`;
		const local = `${SHEET}function Edit() {\n\tconst Sheet = { Root: (props: { custom: string }) => props.custom };\n\treturn <Sheet.Root custom="ok" />;\n}`;

		expect(partsOf(intrinsic)).toEqual([]);
		expect(partsOf(local)).toEqual([]);
		expect(
			partsOf(
				'import { IconButton } from "@ngrok/mantle/icon-button";\nconst props: import("react").ComponentProps<typeof IconButton> = x;\n<IconButton label="Close" />;',
			),
		).toMatchObject([{ code: "missing-prop", message: "IconButton requires icon." }]);
	});

	it("reports dialog content with no title, label, or code that can render one", () => {
		const wrap = (content: string) =>
			`${SHEET}<Sheet.Root><Sheet.Content>${content}</Sheet.Content></Sheet.Root>;`;

		expect(partsOf(wrap("Body"))).toEqual([
			{
				code: "missing-dialog-title",
				message: "Sheet.Content has no Sheet.Title, so the dialog has no accessible name.",
				fix: "Add <Sheet.Title> inside it, or set aria-label on Sheet.Content.",
			},
		]);
		expect(partsOf(wrap("<Sheet.Title>Edit</Sheet.Title>Body"))).toEqual([]);
		expect(partsOf(wrap("<EditHeader />"))).toEqual([]);
		expect(partsOf(wrap("{renderTitle()}"))).toEqual([]);
		expect(partsOf(wrap("<parts.Header />"))).toEqual([]);
		expect(partsOf(wrap("<div children={<Sheet.Title>Edit</Sheet.Title>} />"))).toEqual([]);
		expect(
			partsOf(
				wrap(
					"<Sheet.Root><Sheet.Content><Sheet.Title>Inner</Sheet.Title></Sheet.Content></Sheet.Root>",
				),
			),
		).toMatchObject([
			{ code: "missing-dialog-title", message: expect.stringContaining("Sheet.Content") },
		]);
		expect(
			partsOf(
				`${SHEET}<Sheet.Root><Sheet.Content children={<Sheet.Title>Edit</Sheet.Title>} /></Sheet.Root>;`,
			),
		).toEqual([]);
	});
});
