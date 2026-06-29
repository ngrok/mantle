import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ScrollableList } from "./scrollable-list.js";

describe("ScrollableList.Item", () => {
	test("renders a type=button by default", () => {
		render(<ScrollableList.Item onClick={() => {}}>Account</ScrollableList.Item>);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute("type", "button");
	});

	test("clicking fires onClick", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(<ScrollableList.Item onClick={onClick}>Account</ScrollableList.Item>);

		await user.click(screen.getByRole("button", { name: "Account" }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	test("a disabled button is disabled", () => {
		render(<ScrollableList.Item disabled>Account</ScrollableList.Item>);
		expect(screen.getByRole("button", { name: "Account" })).toBeDisabled();
	});

	test("asChild renders the provided element (e.g. a link) with the item slot", () => {
		render(
			<ScrollableList.Item asChild>
				<a href="/accounts/1">Account</a>
			</ScrollableList.Item>,
		);

		const link = screen.getByRole("link", { name: "Account" });
		expect(link).toHaveAttribute("href", "/accounts/1");
		expect(link).toHaveAttribute("data-slot", "scrollable-list-item");
	});

	test("asChild conveys disabled via aria-disabled (since <a> has no disabled)", () => {
		render(
			<ScrollableList.Item asChild disabled>
				<a href="/accounts/1">Account</a>
			</ScrollableList.Item>,
		);
		expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("aria-disabled", "true");
	});

	test("reflects selected as a data attribute", () => {
		render(
			<ScrollableList.Item selected onClick={() => {}}>
				Account
			</ScrollableList.Item>,
		);
		expect(screen.getByRole("button", { name: "Account" })).toHaveAttribute(
			"data-selected",
			"true",
		);
	});
});
