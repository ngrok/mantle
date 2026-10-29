import { describe, expect, it } from "vitest";
import { checkCode } from "~/utilities/mcp/check.server";
import { packageFilesFixture } from "~/utilities/mcp/test-fixtures";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";

const data = versionDataFromFiles("0.93.0", packageFilesFixture());

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
});
