import { describe, expect, it } from "vitest";
import {
	decodePreviewFragment,
	encodePreviewFragment,
	MAX_PREVIEW_CODE_BYTES,
	MAX_PREVIEW_FRAGMENT_LENGTH,
	parsePreviewHash,
	previewUrl,
} from "./preview-url";

const code = `import { Button } from "@ngrok/mantle/button";

export default function App() {
	return <Button type="button">Delete — sûr?</Button>;
}
`;

async function deflate(text: string) {
	const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("deflate-raw"));
	const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	return btoa(String.fromCharCode(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

describe("encodePreviewFragment and decodePreviewFragment", () => {
	it("round-trips TSX with non-ASCII text through a URL-safe value", async () => {
		const value = await encodePreviewFragment(code);
		expect(value).toMatch(/^[\w-]+$/);
		expect(await decodePreviewFragment(value)).toEqual({ ok: true, code });
	});

	it("refuses to encode code over the byte cap", async () => {
		await expect(encodePreviewFragment("x".repeat(MAX_PREVIEW_CODE_BYTES + 1))).rejects.toThrow(
			RangeError,
		);
	});

	it("encodes code at the byte cap", async () => {
		const atCap = "x".repeat(MAX_PREVIEW_CODE_BYTES);
		expect(await decodePreviewFragment(await encodePreviewFragment(atCap))).toEqual({
			ok: true,
			code: atCap,
		});
	});

	it("rejects a small value that expands past the byte cap", async () => {
		// The repeated text compresses to a few hundred characters, far under the fragment cap.
		const bomb = await deflate("x".repeat(MAX_PREVIEW_CODE_BYTES + 1));
		expect(bomb.length).toBeLessThan(MAX_PREVIEW_FRAGMENT_LENGTH);
		expect(await decodePreviewFragment(bomb)).toEqual({ ok: false, reason: "too-large" });
	});

	it("rejects a value over the fragment cap before it decodes", async () => {
		expect(await decodePreviewFragment("a".repeat(MAX_PREVIEW_FRAGMENT_LENGTH + 1))).toEqual({
			ok: false,
			reason: "too-large",
		});
	});

	it("reports a missing value", async () => {
		expect(await decodePreviewFragment(null)).toEqual({ ok: false, reason: "missing" });
	});

	it("rejects characters outside base64url", async () => {
		expect(await decodePreviewFragment("abc+/=")).toEqual({ ok: false, reason: "invalid" });
	});

	it("rejects base64url that is not deflate data", async () => {
		expect(await decodePreviewFragment("bm90LWRlZmxhdGU")).toEqual({
			ok: false,
			reason: "invalid",
		});
	});
});

describe("previewUrl", () => {
	it("puts the code in the fragment of the preview page", async () => {
		const url = new URL(await previewUrl({ origin: "https://mantle.ngrok.com", code }));
		expect(url.pathname).toBe("/mcp/preview");
		expect(url.search).toBe("");
		const parsed = parsePreviewHash(url.hash);
		expect(await decodePreviewFragment(parsed.code)).toEqual({ ok: true, code });
	});
});

describe("parsePreviewHash", () => {
	it("reads the dark theme", () => {
		expect(parsePreviewHash("#code=abc&theme=dark")).toEqual({ code: "abc", theme: "dark" });
	});

	it("reads an unknown theme as light", () => {
		expect(parsePreviewHash("#theme=sepia")).toEqual({ code: null, theme: "light" });
	});
});
