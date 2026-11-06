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
	it("keeps the page and shows an error toast", async () => {
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

		const [trigger] = screen.getAllByRole("button", { name: /search mantle/i });
		if (trigger == null) {
			throw new Error("expected a palette trigger button");
		}
		fireEvent.click(trigger);

		await waitFor(() => {
			expect(
				screen.queryByText("Search failed to load. Reload the page to try again."),
			).not.toBeNull();
		});
		expect(screen.getAllByRole("button", { name: /search mantle/i })).toHaveLength(2);
	});
});
