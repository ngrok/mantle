import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Chip } from "./chip.js";

function TranslatedChip() {
	const [pressed, setPressed] = useState(false);
	return (
		<Chip pressed={pressed} onPressedChange={setPressed}>
			{pressed ? "Write" : "Read"}
		</Chip>
	);
}

describe("Chip", () => {
	test("a controlled chip reports the next state and waits for the prop", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip pressed onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).toHaveBeenCalledWith(false);
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "true");
	});

	test("an uncontrolled chip changes its state", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(<Chip onPressedChange={onPressedChange}>Read</Chip>);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("data-state", "on");
	});

	test("Space and Enter toggle the native button", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		const user = userEvent.setup();
		render(<Chip onPressedChange={onPressedChange}>Read</Chip>);
		const button = screen.getByRole("button", { name: "Read" });
		button.focus();
		await user.keyboard("[Space]");
		expect(onPressedChange).toHaveBeenLastCalledWith(true);
		expect(button).toHaveAttribute("aria-pressed", "true");
		await user.keyboard("{Enter}");
		expect(onPressedChange).toHaveBeenLastCalledWith(false);
		expect(button).toHaveAttribute("aria-pressed", "false");
	});

	test("preventDefault stops the toggle", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip onClick={(event) => event.preventDefault()} onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "false");
	});

	test("a disabled chip cannot be toggled", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip disabled defaultPressed onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "true");
	});

	test("forwards the ref, className, and data attributes", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Chip ref={ref} size="sm" className="custom-chip" data-testid="chip">
				Read
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Read" });
		expect(ref.current).toBe(button);
		expect(button).toHaveAttribute("data-testid", "chip");
		expect(button).toHaveAttribute("data-slot", "chip");
		expect(button).toHaveAttribute("data-size", "sm");
		expect(button.querySelector('[data-slot="chip-label"]')).toHaveClass("contents");
		expect(button).toHaveClass("custom-chip");
	});

	test("asChild merges the ref, classes, and slots onto a button", async () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Chip asChild ref={ref} className="chip-class">
				<button type="button" className="child-class" data-slot="custom-button">
					Read
				</button>
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Read" });
		expect(ref.current).toBe(button);
		expect(button).toHaveAttribute("data-slot", "chip custom-button");
		expect(button).toHaveClass("chip-class", "child-class");
		await userEvent.setup().click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");
	});

	test("a translated label can change beside the icon", async () => {
		render(<TranslatedChip />);
		const button = screen.getByRole("button", { name: "Read" });
		translateTextNodes(button);
		await userEvent.setup().click(button);
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
		expect(button).toHaveTextContent("Write");
	});
});
