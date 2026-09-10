// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import { IconsExplorer } from "./icons-explorer";
import { iconData } from "./icons/icon-data";

afterEach(() => {
	cleanup();
});

describe("IconsExplorer", () => {
	test("shows every icon before a search", () => {
		render(<IconsExplorer />);

		expect(screen.getAllByRole("listitem")).toHaveLength(iconData.length);
	});

	test("narrows the grid to the icons the query matches", async () => {
		const user = userEvent.setup();
		render(<IconsExplorer />);

		await user.type(screen.getByRole("textbox", { name: "Search Icons" }), "logo");

		const shown = screen.getAllByRole("listitem").map((item) => item.textContent);
		expect(shown).toHaveLength(2);
		expect(shown[0]).toContain("NgrokLettermarkIcon");
		expect(shown[1]).toContain("NgrokWordmarkIcon");
	});

	test("offers a clear button when nothing matches, and the button restores the grid", async () => {
		const user = userEvent.setup();
		render(<IconsExplorer />);
		const search = screen.getByRole("textbox", { name: "Search Icons" });

		await user.type(search, "zzzz");

		expect(screen.queryAllByRole("listitem")).toHaveLength(0);
		expect(screen.getByText("zzzz").textContent).toBe("zzzz");

		await user.click(screen.getByRole("button", { name: "Clear Search" }));

		expect(screen.getAllByRole("listitem")).toHaveLength(iconData.length);
		expect(search).toHaveProperty("value", "");
	});
});
