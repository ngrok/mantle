import { ThemeProvider } from "@ngrok/mantle/theme";
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";

/**
 * Hydration checks for the docs site, in happy-dom. A mismatch between the
 * server markup and the first client render makes React throw the server tree
 * away and repaint, so the page flashes and the console reports it. These
 * helpers render on a server with no browser globals, hydrate under the
 * providers `root.tsx` mounts, and return every error React reports.
 */

// Why: React checks a client `autoFocus` prop against `element.autofocus`, and
// happy-dom has no such property, so every `autoFocus={false}` would read as a
// mismatch here and in no browser.
if (typeof HTMLElement !== "undefined" && !("autofocus" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "autofocus", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("autofocus");
		},
	});
}

/** The providers `root.tsx` mounts around every route, with nothing a request would set. */
function RootProviders({ children }: { children: ReactNode }) {
	return (
		<ThemeProvider>
			<TooltipProvider>
				<QueryClientProvider
					client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
				>
					{children}
				</QueryClientProvider>
			</TooltipProvider>
		</ThemeProvider>
	);
}

/**
 * Renders on the server with the browser globals gone, so a render that reads
 * `window`, `document`, or `navigator` throws here instead of agreeing with
 * itself. happy-dom lends the test the browser; the real server has none.
 */
function renderOnServer(app: ReactNode): string {
	vi.stubGlobal("window", undefined);
	vi.stubGlobal("document", undefined);
	vi.stubGlobal("navigator", undefined);
	try {
		return renderToString(app);
	} finally {
		vi.unstubAllGlobals();
	}
}

/**
 * Renders `app` on the server, hydrates the markup on the client, and returns
 * every error React reported on the way: a recoverable error, or a console
 * error such as a hydration mismatch or a missing key. An empty array is a
 * clean hydration. The root is unmounted before this returns.
 *
 * @example
 * ```tsx
 * expect(hydrationErrorsOf(<Demo />)).toEqual([]);
 * ```
 */
function hydrationErrorsOf(app: ReactNode): ReadonlyArray<string> {
	const tree = <RootProviders>{app}</RootProviders>;
	const html = renderOnServer(tree);
	if (html === "") {
		throw new Error("The server rendered nothing, so there is nothing to hydrate.");
	}
	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.append(container);
	const errors: Array<string> = [];
	const consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
		errors.push(args.map(String).join(" "));
	});
	let root: Root | undefined;
	try {
		act(() => {
			root = hydrateRoot(container, tree, {
				onRecoverableError: (error) => {
					errors.push(String(error));
				},
			});
		});
		act(() => {
			root?.unmount();
		});
	} finally {
		consoleError.mockRestore();
		container.remove();
	}
	return errors;
}

export {
	//,
	hydrationErrorsOf,
};
