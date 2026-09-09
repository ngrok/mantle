import { act } from "@testing-library/react";
import type { ReactElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import { ThemeProvider } from "../theme/theme-provider.js";
import { resolvedThemes } from "../theme/themes.js";
import { AutoThemeIcon, ThemeIcon } from "./theme.js";

const THEME_COOKIE = "mantle-ui-theme";

/**
 * `ThemeProvider` writes onto the shared `<html>` element and the document
 * cookie, so every test undoes both.
 */
function resetRootTheme() {
	const html = document.documentElement;
	html.classList.remove(...resolvedThemes);
	html.removeAttribute("data-theme");
	html.removeAttribute("data-applied-theme");
	document.cookie = `${THEME_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Renders on the server path. happy-dom defines `window`, so `canUseDOM()`
 * returns true. The `window` stub routes `ThemeProvider` to `ssrCookie`.
 */
function renderOnServer(element: ReactElement): string {
	vi.stubGlobal("window", undefined);
	try {
		return renderToString(element);
	} finally {
		vi.unstubAllGlobals();
	}
}

/**
 * The glyph of the first `<path>` in an HTML string. Each phosphor glyph here
 * is a single path, so `d` identifies the icon.
 */
function glyphOf(html: string): string | null {
	const template = document.createElement("template");
	template.innerHTML = html;
	const path = template.content.querySelector("path");
	return path == null ? null : path.getAttribute("d");
}

describe("AutoThemeIcon", () => {
	afterEach(() => {
		resetRootTheme();
	});

	test("hydrates the stored theme's glyph when ThemeProvider gets ssrCookie", () => {
		mockMatchMedia({});
		document.cookie = `${THEME_COOKIE}=dark; path=/`;
		const app = (
			<ThemeProvider ssrCookie={`${THEME_COOKIE}=dark`}>
				<AutoThemeIcon />
			</ThemeProvider>
		);
		const container = document.createElement("div");
		container.innerHTML = renderOnServer(app);
		document.body.append(container);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, app, { onRecoverableError });
		});

		const moonGlyph = glyphOf(renderToString(<ThemeIcon theme="dark" />));
		const sunGlyph = glyphOf(renderToString(<ThemeIcon theme="light" />));
		// Why the guard: a null glyph on both sides would make the equality below pass for nothing.
		expect(moonGlyph).not.toBeNull();
		expect(moonGlyph).not.toBe(sunGlyph);

		const hydratedPath = container.querySelector("path");
		expect(hydratedPath == null ? null : hydratedPath.getAttribute("d")).toBe(moonGlyph);
		expect(consoleError).toHaveBeenCalledTimes(0);
		expect(onRecoverableError).toHaveBeenCalledTimes(0);

		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});
