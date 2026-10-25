// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { hydrationErrorsOf } from "./hydration";
import { canUseDOM } from "@ngrok/mantle/browser-only";

/** A render that reads the browser: the shape every sweep must catch. */
function WindowBranch() {
	return <p>{canUseDOM() ? "client" : "server"}</p>;
}

it("reports a server/client branch as a hydration mismatch", () => {
	const errors = hydrationErrorsOf(<WindowBranch />);
	expect(errors.length).toBeGreaterThan(0);
	expect(errors.join("\n")).toMatch(/hydrat/i);
});

it("reports nothing for markup that hydrates clean", () => {
	expect(hydrationErrorsOf(<p>same on both sides</p>)).toEqual([]);
});
