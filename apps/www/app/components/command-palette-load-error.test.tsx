// @vitest-environment happy-dom
import { Toaster } from "@ngrok/mantle/toast";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./command-palette";

// Why: a module factory that throws makes the dialog `import()` reject, as an old chunk does after a deploy.
vi.mock("~/components/command-palette-dialog", () => {
	throw new Error("Failed to fetch dynamically imported module");
});

describe("CommandPalette when the dialog fails to load", () => {
	it("stays silent until the palette opens, then keeps the page and shows an error toast", async () => {
		const Stub = createRoutesStub([
			{
				path: "*",
				Component: () => (
					<>
						<Toaster />
						<CommandPalette />
					</>
				),
			},
		]);
		render(<Stub />);
		const toastText = "Search failed to load. Reload the page to try again.";
		// Why: the dialog loads, and fails, after hydration. That failure must stay
		// silent, so a `waitFor` for the toast must time out.
		await expect(
			waitFor(
				() => {
					expect(screen.queryByText(toastText)).not.toBeNull();
				},
				{ timeout: 500 },
			),
		).rejects.toThrow("expected null not to be null");

		const [trigger] = screen.getAllByRole("button", { name: /search mantle/i });
		if (trigger == null) {
			throw new Error("expected a palette trigger button");
		}
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(screen.queryByText(toastText)).not.toBeNull();
		});
		expect(screen.getAllByRole("button", { name: /search mantle/i })).toHaveLength(2);
	});
});
