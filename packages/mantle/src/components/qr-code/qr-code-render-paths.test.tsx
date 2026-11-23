import { act } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { prerender } from "react-dom/static";
import { afterEach, describe, expect, test, vi } from "vitest";
import { encodeQrCode } from "./qr-code-geometry.js";

const value = "https://ngrok.com";
const otherValue = "https://example.com";
const geometryOf = (input: string) =>
	encodeQrCode({ value: input, ecc: "L", quietZone: 4, pixelSize: 10 });

let mounted: Root | undefined;

afterEach(() => {
	act(() => mounted?.unmount());
	mounted = undefined;
	document.body.replaceChildren();
});

/**
 * Imports the QrCode parts from a new module registry, so the encoder cache
 * starts empty, as it does on a page load. React stays one instance per worker.
 */
async function importQrCode() {
	vi.resetModules();
	return import("./qr-code-parts.js");
}

type QrCodeParts = Awaited<ReturnType<typeof importQrCode>>;

function qrCodeTree(QrCode: QrCodeParts, input: string) {
	return (
		<QrCode.Root value={input}>
			<QrCode.Frame>
				<QrCode.Pattern />
			</QrCode.Frame>
		</QrCode.Root>
	);
}

/**
 * Renders the HTML that a Node server sends: no DOM, and the `default`
 * condition of `#qr-code-encoder`.
 */
async function renderServerHtml(input: string): Promise<string> {
	vi.stubGlobal("window", undefined);
	// Why: happy-dom resolves the `browser` condition, so this maps the import to the file that Node resolves.
	vi.doMock("#qr-code-encoder", () => import("./qr-code-encoder.js"));
	const html = renderToString(qrCodeTree(await importQrCode(), input));
	vi.doUnmock("#qr-code-encoder");
	vi.unstubAllGlobals();
	return html;
}

/**
 * Hydrates the server HTML for `value` with a fresh browser module, and
 * counts each load of the encoder chunk.
 */
async function hydrateServerHtml() {
	const html = await renderServerHtml(value);
	const loadGeometry = vi.fn<() => void>();
	// Why: a pass-through wrapper, because the chunk load is the one trace of shipped encoder code.
	vi.doMock("./qr-code-geometry.js", async (importOriginal) => {
		loadGeometry();
		return importOriginal();
	});
	const QrCode = await importQrCode();
	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.append(container);
	await act(async () => {
		mounted = hydrateRoot(container, qrCodeTree(QrCode, value));
	});
	await vi.dynamicImportSettled();
	return { QrCode, container, loadGeometry };
}

function readGeometry(container: HTMLElement) {
	return {
		path: container.querySelector("path")?.getAttribute("d"),
		viewBox: container.querySelector("svg")?.getAttribute("viewBox"),
	};
}

/** Shows a fallback when a child throws. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	override state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	override render() {
		return this.state.failed ? "The QR code failed." : this.props.children;
	}
}

describe("QrCode render paths", () => {
	test("the server render holds the finished SVG", async () => {
		const html = await renderServerHtml(value);
		const { path, dimension } = geometryOf(value);
		expect(html).toContain(`viewBox="0 0 ${dimension} ${dimension}"`);
		expect(html).toContain(`d="${path}"`);
	});

	test("a server that resolves the `browser` condition waits for the encoder chunk", async () => {
		vi.stubGlobal("window", undefined);
		const { prelude } = await prerender(qrCodeTree(await importQrCode(), value));
		const html = await new Response(prelude).text();
		expect(html).toContain(`d="${geometryOf(value).path}"`);
	});

	test("hydration keeps the server SVG without loading the encoder", async () => {
		const consoleError = vi.spyOn(console, "error");
		const { container, loadGeometry } = await hydrateServerHtml();
		const { path, dimension } = geometryOf(value);
		expect(readGeometry(container)).toEqual({ path, viewBox: `0 0 ${dimension} ${dimension}` });
		expect(loadGeometry).not.toHaveBeenCalled();
		// Why: React reports a hydration mismatch through `console.error`.
		expect(consoleError).not.toHaveBeenCalled();
	});

	test("a new value after hydration loads the encoder and draws the new code", async () => {
		const { QrCode, container, loadGeometry } = await hydrateServerHtml();
		act(() => mounted?.render(qrCodeTree(QrCode, otherValue)));
		await act(() => vi.dynamicImportSettled());
		const { path, dimension } = geometryOf(otherValue);
		expect(readGeometry(container)).toEqual({ path, viewBox: `0 0 ${dimension} ${dimension}` });
		expect(loadGeometry).toHaveBeenCalledOnce();
	});

	test("a client-only value draws when the encoder chunk loads, and later mounts draw at once", async () => {
		const QrCode = await importQrCode();
		const first = document.body.appendChild(document.createElement("div"));
		mounted = createRoot(first);
		act(() => mounted?.render(qrCodeTree(QrCode, value)));
		expect(readGeometry(first)).toEqual({ path: "", viewBox: null });

		await act(() => vi.dynamicImportSettled());
		expect(readGeometry(first).path).toBe(geometryOf(value).path);

		// Why a second root: the encoder is cached now, so a new mount encodes in its first render.
		const second = document.body.appendChild(document.createElement("div"));
		const secondRoot = createRoot(second);
		act(() => secondRoot.render(qrCodeTree(QrCode, otherValue)));
		expect(readGeometry(second).path).toBe(geometryOf(otherValue).path);
		act(() => secondRoot.unmount());
	});

	test("an encoder chunk that fails to load reaches the error boundary", async () => {
		vi.doMock("./qr-code-geometry.js", () => {
			throw new Error("The chunk failed to load.");
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
		const QrCode = await importQrCode();
		const container = document.body.appendChild(document.createElement("div"));
		mounted = createRoot(container);
		act(() => mounted?.render(<ErrorBoundary>{qrCodeTree(QrCode, value)}</ErrorBoundary>));
		await act(() => vi.dynamicImportSettled());
		expect(container).toHaveTextContent("The QR code failed.");
	});
});
