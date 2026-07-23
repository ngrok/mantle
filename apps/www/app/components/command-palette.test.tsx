// @vitest-environment happy-dom
import { ThemeProvider } from "@ngrok/mantle/theme";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./command-palette";
import { MantleVersionProvider } from "./mantle-version-provider";

/**
 * Renders the palette inside the providers it expects from the app root,
 * with a real Tabs docs route (so navigation has an observable landing page)
 * and a catch-all for everything else.
 */
function renderPalette() {
	const PaletteHarness = () => (
		<ThemeProvider>
			<MantleVersionProvider mantleVersion="4.2.0">
				<CommandPalette />
			</MantleVersionProvider>
		</ThemeProvider>
	);
	const Stub = createRoutesStub([
		{ path: "/components/navigation/tabs", Component: () => <div>Tabs docs page</div> },
		{ path: "*", Component: PaletteHarness },
	]);
	return render(<Stub />);
}

async function openPalette() {
	const [trigger] = screen.getAllByRole("button", { name: /search mantle/i });
	if (trigger == null) {
		throw new Error("expected a palette trigger button");
	}
	fireEvent.click(trigger);
	return await waitFor(() => screen.getByPlaceholderText("Search Mantle..."));
}

afterEach(() => {
	cleanup();
});

describe("CommandPalette", () => {
	it("browses all commands grouped by section when the query is empty", async () => {
		renderPalette();
		await openPalette();

		expect(screen.getByText("Welcome")).toBeTruthy();
		expect(screen.getByText("Components: Navigation")).toBeTruthy();
		expect(screen.getByRole("option", { name: /Overview & Setup/ })).toBeTruthy();
	});

	// Regression: with cmdk's built-in filtering, searching "tabs" surfaced
	// Tailwind Variants, Typography, and Table while the Tabs page stayed
	// below the fold — cmdk's group sorting is a silent no-op upstream. The
	// palette now owns ranking (shouldFilter={false} + match-sorter), so the
	// DOM must list the exact title match first.
	it("renders search results in ranked order with the best match first", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "tabs" } });

		await waitFor(() => {
			const options = screen.getAllByRole("option");
			expect(options[0]?.textContent).toContain("Tabs");
			expect(options[0]?.getAttribute("href")).toBe("/components/navigation/tabs");
		});
		expect(screen.queryByText("Tailwind Variants")).toBeNull();
	});

	it("selects the top-ranked result so Enter navigates to it and closes the palette", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "tabs" } });

		await waitFor(() => {
			expect(screen.getAllByRole("option")[0]?.getAttribute("aria-selected")).toBe("true");
		});

		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => {
			expect(screen.getByText("Tabs docs page")).toBeTruthy();
		});
		expect(screen.queryByPlaceholderText("Search Mantle...")).toBeNull();
	});

	it("applies the chosen theme when a theme command is selected", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "dark" } });
		const darkOption = await waitFor(() => screen.getByRole("option", { name: "Use Dark theme" }));

		fireEvent.click(darkOption);

		await waitFor(() => {
			expect(document.documentElement.classList.contains("dark")).toBe(true);
		});
		expect(screen.queryByPlaceholderText("Search Mantle...")).toBeNull();
	});

	it("opens external commands in a new tab when selected", async () => {
		const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "ngrok/mantle" } });
		const repoOption = await waitFor(() => screen.getByRole("option", { name: /GitHub Repo/ }));

		fireEvent.click(repoOption);

		expect(openSpy).toHaveBeenCalledWith("https://github.com/ngrok/mantle", "_blank", "noopener");
		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Search Mantle...")).toBeNull();
		});
		openSpy.mockRestore();
	});

	it("badges preview components inline in search results", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "calendar" } });

		await waitFor(() => {
			const options = screen.getAllByRole("option");
			expect(options[0]?.textContent).toContain("Calendar");
			expect(options[0]?.textContent).toContain("Preview");
		});
	});

	// Regression: cmdk hides separators whenever its internal search state is
	// non-empty, and a whitespace-only query keeps the browse view while still
	// syncing " " into cmdk — separators must not blink out.
	it("keeps browse-view separators visible for a whitespace-only query", async () => {
		renderPalette();
		const input = await openPalette();

		const separatorCount = document.querySelectorAll("[data-slot='command-separator']").length;
		expect(separatorCount).toBeGreaterThan(0);

		fireEvent.change(input, { target: { value: " " } });

		await waitFor(() => {
			expect(screen.getByText("Welcome")).toBeTruthy();
		});
		expect(document.querySelectorAll("[data-slot='command-separator']").length).toBe(
			separatorCount,
		);
	});

	it("shows the empty state when nothing matches", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "xyzzyplugh" } });

		await waitFor(() => {
			expect(screen.getByText("No results found.")).toBeTruthy();
		});
	});

	// Regression: without preventDefault, mod+k also triggers the browser's own
	// binding (Firefox focuses the search/address bar) alongside opening the
	// palette. fireEvent returns false when the event's default was prevented.
	// react-hotkeys-hook matches on event.code and resolves "mod" per platform
	// userAgent, so the event carries code plus both modifiers.
	it("opens on mod+k and prevents the browser's default shortcut", async () => {
		renderPalette();

		const notPrevented = fireEvent.keyDown(document.body, {
			key: "k",
			code: "KeyK",
			metaKey: true,
			ctrlKey: true,
		});

		expect(notPrevented).toBe(false);
		await waitFor(() => {
			expect(screen.getByPlaceholderText("Search Mantle...")).toBeTruthy();
		});
	});

	it("clears the query when the palette closes so reopening starts fresh", async () => {
		renderPalette();
		const input = await openPalette();

		fireEvent.change(input, { target: { value: "tabs" } });
		fireEvent.keyDown(input, { key: "Escape" });

		await waitFor(() => {
			expect(screen.queryByPlaceholderText("Search Mantle...")).toBeNull();
		});

		const reopenedInput = await openPalette();
		if (!(reopenedInput instanceof HTMLInputElement)) {
			throw new Error("expected the palette input to be an input element");
		}
		expect(reopenedInput.value).toBe("");
		expect(screen.getByText("Welcome")).toBeTruthy();
	});
});
