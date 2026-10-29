/**
 * The largest TSX source, in UTF-8 bytes, that a preview link carries.
 */
export const MAX_PREVIEW_CODE_BYTES = 20 * 1024;

/**
 * The longest encoded `code` value, in characters, that the preview page reads.
 * Deflate can grow incompressible input a little, and base64 adds a third.
 */
export const MAX_PREVIEW_FRAGMENT_LENGTH = 32 * 1024;

/** The result of {@link decodePreviewFragment}. */
export type DecodePreviewResult =
	| { ok: true; code: string }
	| { ok: false; reason: "missing" | "too-large" | "invalid" };

/** A preview theme. The frame renders the prototype in this theme. */
export type PreviewTheme = "light" | "dark";

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> | null {
	if (!/^[\w-]*$/.test(value)) {
		return null;
	}
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	try {
		const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		return Uint8Array.from(binary, (character) => character.charCodeAt(0));
	} catch {
		return null;
	}
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/**
 * Compresses TSX source into the `code` value of a preview link fragment:
 * deflate-raw, then base64url. Throws a `RangeError` when the source is over
 * {@link MAX_PREVIEW_CODE_BYTES}.
 *
 * @example
 * const value = await encodePreviewFragment("export default function App() { return null; }");
 * // => "S60oLkrMS1FIL..." (URL-safe, no padding)
 */
export async function encodePreviewFragment(code: string): Promise<string> {
	const source = new TextEncoder().encode(code);
	if (source.byteLength > MAX_PREVIEW_CODE_BYTES) {
		throw new RangeError(
			`The code is ${source.byteLength} bytes. A preview link carries at most ${MAX_PREVIEW_CODE_BYTES} bytes.`,
		);
	}
	const compressed = await readStream(
		new Blob([source]).stream().pipeThrough(new CompressionStream("deflate-raw")),
	);
	return bytesToBase64Url(compressed);
}

/**
 * Reverses {@link encodePreviewFragment}. Never throws: a missing, oversized,
 * or undecodable value returns `ok: false` with the reason. The decompression
 * stops at {@link MAX_PREVIEW_CODE_BYTES}, so a small fragment cannot expand
 * into a large string.
 *
 * @example
 * const result = await decodePreviewFragment(new URLSearchParams(location.hash.slice(1)).get("code"));
 * if (result.ok) {
 *   render(result.code);
 * }
 */
export async function decodePreviewFragment(
	value: string | null | undefined,
): Promise<DecodePreviewResult> {
	if (value == null || value === "") {
		return { ok: false, reason: "missing" };
	}
	if (value.length > MAX_PREVIEW_FRAGMENT_LENGTH) {
		return { ok: false, reason: "too-large" };
	}
	const compressed = base64UrlToBytes(value);
	if (compressed == null) {
		return { ok: false, reason: "invalid" };
	}

	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		const stream = new Blob([compressed])
			.stream()
			.pipeThrough(new DecompressionStream("deflate-raw"));
		// Why break: leaving the loop cancels the stream, so decompression stops at the cap.
		for await (const chunk of stream) {
			total += chunk.byteLength;
			if (total > MAX_PREVIEW_CODE_BYTES) {
				break;
			}
			chunks.push(chunk);
		}
	} catch {
		return { ok: false, reason: "invalid" };
	}
	if (total > MAX_PREVIEW_CODE_BYTES) {
		return { ok: false, reason: "too-large" };
	}

	try {
		const decoder = new TextDecoder("utf-8", { fatal: true });
		const code = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("");
		return { ok: true, code: code + decoder.decode() };
	} catch {
		return { ok: false, reason: "invalid" };
	}
}

/**
 * Builds the preview page link for TSX source. The code travels in the URL
 * fragment, so the browser never sends it to the server.
 *
 * @example
 * await previewUrl({ origin: "https://mantle.ngrok.com", code });
 * // => "https://mantle.ngrok.com/mcp/preview#code=S60oLkrMS1FIL..."
 */
export async function previewUrl({ origin, code }: { origin: string; code: string }) {
	return `${origin}/mcp/preview#code=${await encodePreviewFragment(code)}`;
}

/**
 * Reads the `code` and `theme` values from a preview fragment (`#code=…&theme=dark`).
 * A missing or unknown theme reads as `"light"`.
 *
 * @example
 * parsePreviewHash("#code=abc&theme=dark"); // => { code: "abc", theme: "dark" }
 */
export function parsePreviewHash(hash: string): { code: string | null; theme: PreviewTheme } {
	const params = new URLSearchParams(hash.replace(/^#/, ""));
	return {
		code: params.get("code"),
		theme: params.get("theme") === "dark" ? "dark" : "light",
	};
}
