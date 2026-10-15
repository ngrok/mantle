// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { readDocumentNonce } from "./nonce";

afterEach(() => {
	document.body.innerHTML = "";
});

it("reads the nonce from the first script that carries one", () => {
	document.body.innerHTML = `<script></script><script nonce="r3qu3st"></script><script nonce="later"></script>`;
	expect(readDocumentNonce(document)).toBe("r3qu3st");
});

it("prefers the nonce property the browser keeps when a CSP hides the attribute", () => {
	document.body.innerHTML = `<script nonce=""></script>`;
	const script = document.querySelector("script");
	if (script == null) {
		throw new Error("The fixture renders no script.");
	}
	// Why: happy-dom has no `nonce` property, so this stands in for the browser's.
	Object.defineProperty(script, "nonce", { value: "h1dd3n" });
	expect(readDocumentNonce(document)).toBe("h1dd3n");
});

it("returns an empty nonce when no script carries one", () => {
	document.body.innerHTML = `<script></script>`;
	expect(readDocumentNonce(document)).toBe("");
});
