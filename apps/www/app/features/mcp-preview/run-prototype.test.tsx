// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { runPrototype } from "./run-prototype";

describe("runPrototype", () => {
	it("runs a TSX prototype that imports mantle", async () => {
		const result = await runPrototype(`
			import { Button } from "@ngrok/mantle/button";
			type Props = { label?: string };
			export default function App({ label = "Delete key" }: Props) {
				return <Button type="button">{label}</Button>;
			}
		`);
		if (!result.ok) {
			throw new Error(result.message);
		}
		render(<result.Component />);
		expect(screen.getByRole("button", { name: "Delete key" }).tagName).toBe("BUTTON");
	});

	it("names an import the preview cannot load", async () => {
		const result = await runPrototype(
			`import { chunk } from "lodash"; export default () => chunk;`,
		);
		expect(result).toMatchObject({
			ok: false,
			title: "The code imports a module the preview cannot load",
			message: expect.stringContaining("`lodash`"),
		});
	});

	it("ignores require text inside a string", async () => {
		const result = await runPrototype(
			`export default function App() { return <p>{'require("fs")'}</p>; }`,
		);
		if (!result.ok) {
			throw new Error(result.message);
		}
		render(<result.Component />);
		expect(screen.getByText('require("fs")').tagName).toBe("P");
	});

	it("accepts a memoized default export", async () => {
		const result = await runPrototype(`
			import { memo } from "react";
			export default memo(function App() { return <p>Memo</p>; });
		`);
		if (!result.ok) {
			throw new Error(result.message);
		}
		render(<result.Component />);
		expect(screen.getByText("Memo").tagName).toBe("P");
	});

	it("reports a syntax error", async () => {
		const result = await runPrototype(`export default function App() { return <div>; }`);
		expect(result).toMatchObject({ ok: false, title: "The code does not compile" });
	});

	it("reports an error the module throws when it loads", async () => {
		const result = await runPrototype(`throw new Error("boom"); export default () => null;`);
		expect(result).toEqual({ ok: false, title: "The code throws when it loads", message: "boom" });
	});

	it("reports a missing default export", async () => {
		const result = await runPrototype(`export const App = () => null;`);
		expect(result).toMatchObject({ ok: false, title: "The code has no default export" });
	});
});
