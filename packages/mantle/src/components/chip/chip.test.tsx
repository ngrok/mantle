import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StarIcon } from "@phosphor-icons/react/Star";
import { createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { Chip } from "./chip.js";

function TranslatedChip() {
	const [pressed, setPressed] = useState(false);
	return (
		<Chip selectable pressed={pressed} onPressedChange={setPressed}>
			{pressed ? "Write" : "Read"}
		</Chip>
	);
}

describe("Chip", () => {
	test("a plain chip is a label without a button", () => {
		const { container } = render(<Chip>Read</Chip>);
		expect(screen.queryByRole("button")).toBeNull();
		expect(container.querySelector('[data-slot="chip"]')).toHaveTextContent("Read");
	});

	test("a removable chip names its button and calls onRemove", async () => {
		const onRemove = vi.fn<() => void>();
		const onClick = vi.fn<() => void>();
		render(
			<Chip onRemove={onRemove} removeLabel="Detach model" onClick={onClick}>
				Model
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Detach model" });
		expect(button).toHaveAttribute("data-slot", "chip-remove");
		expect(button).toHaveAttribute("tabindex", "0");
		await userEvent.setup().click(button);
		expect(onRemove).toHaveBeenCalledOnce();
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a removable selectable chip toggles and removes with separate buttons", async () => {
		const onRemove = vi.fn<() => void>();
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		const user = userEvent.setup();
		const { container } = render(
			<Chip
				selectable
				onRemove={onRemove}
				removeLabel="Remove model"
				onPressedChange={onPressedChange}
			>
				Model
			</Chip>,
		);
		const chip = container.querySelector('[data-slot="chip"]');
		const toggle = screen.getByRole("button", { name: "Model" });
		const remove = screen.getByRole("button", { name: "Remove model" });
		expect(chip?.tagName).toBe("SPAN");
		expect(toggle).toHaveAttribute("data-slot", "chip-toggle");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
		await user.click(toggle);
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		expect(chip).toHaveAttribute("data-state", "on");
		await user.click(remove);
		expect(onRemove).toHaveBeenCalledOnce();
		expect(onPressedChange).toHaveBeenCalledOnce();
	});

	test("a locked removable chip still toggles but cannot be removed", async () => {
		const onRemove = vi.fn<() => void>();
		const user = userEvent.setup();
		render(
			<Chip selectable locked onRemove={onRemove} removeLabel="Remove scope">
				Scope
			</Chip>,
		);
		const toggle = screen.getByRole("button", { name: "Scope" });
		const remove = screen.getByRole("button", { name: "Remove scope" });
		await user.click(toggle);
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		await user.click(remove);
		expect(onRemove).not.toHaveBeenCalled();
		expect(remove).toHaveAttribute("aria-disabled", "true");
	});

	test("a controlled removable chip waits for its pressed prop", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip
				selectable
				pressed
				onPressedChange={onPressedChange}
				onRemove={() => {}}
				removeLabel="Remove model"
			>
				Model
			</Chip>,
		);
		const toggle = screen.getByRole("button", { name: "Model" });
		await userEvent.setup().click(toggle);
		expect(onPressedChange).toHaveBeenCalledWith(false);
		expect(toggle).toHaveAttribute("aria-pressed", "true");
	});

	test("locked chips keep the remove button but block removal and Delete", async () => {
		const onRemove = vi.fn<() => void>();
		const onKeyDown = vi.fn<() => void>();
		const user = userEvent.setup();
		render(
			<Chip locked onRemove={onRemove} removeLabel="Remove Read" tabIndex={0} onKeyDown={onKeyDown}>
				Read
			</Chip>,
		);
		const chip = screen.getByText("Read").closest<HTMLElement>('[data-slot="chip"]');
		if (chip == null) {
			throw new Error("Expected a Chip root");
		}
		expect(chip).toHaveAttribute("data-locked", "");
		const button = screen.getByRole("button", { name: "Remove Read" });
		expect(button).toHaveAttribute("aria-disabled", "true");
		await user.click(button);
		chip.focus();
		await user.keyboard("{Backspace}{Delete}");
		expect(onRemove).not.toHaveBeenCalled();
		expect(onKeyDown).not.toHaveBeenCalled();
	});

	test("a leading icon has its own slot", () => {
		const { container } = render(<Chip icon={<StarIcon />}>Favorite</Chip>);
		expect(container.querySelector('[data-slot~="chip-icon"]')).toBeInTheDocument();
		expect(container.querySelector('[data-slot="chip-label"]')).toHaveTextContent("Favorite");
	});

	test("a selectable chip can keep a leading icon while its state changes", async () => {
		const { container } = render(
			<Chip selectable icon={<StarIcon />}>
				Favorite
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Favorite" });
		expect(container.querySelector('[data-slot~="chip-icon"]')).toBeInTheDocument();
		await userEvent.setup().click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(container.querySelector('[data-slot~="chip-icon"]')).toBeInTheDocument();
	});

	test("a controlled chip reports the next state and waits for the prop", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip selectable pressed onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).toHaveBeenCalledWith(false);
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "true");
	});

	test("an uncontrolled chip changes its state", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip selectable onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("data-state", "on");
	});

	test("Space and Enter toggle the native button", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		const user = userEvent.setup();
		render(
			<Chip selectable onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
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
			<Chip
				selectable
				onClick={(event) => event.preventDefault()}
				onPressedChange={onPressedChange}
			>
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
			<Chip selectable disabled defaultPressed onPressedChange={onPressedChange}>
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
			<Chip selectable ref={ref} size="sm" className="custom-chip" data-testid="chip">
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
			<Chip selectable asChild ref={ref} className="chip-class">
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

	test("plain asChild merges the ref, classes, and slots onto its child", () => {
		const ref = createRef<HTMLSpanElement>();
		const { container } = render(
			<Chip asChild ref={ref} className="chip-class" data-testid="plain-chip">
				<span className="child-class" data-slot="custom-label">
					Read
				</span>
			</Chip>,
		);
		const chip = container.querySelector('[data-testid="plain-chip"]');
		expect(ref.current).toBe(chip);
		expect(chip).toHaveAttribute("data-slot", "chip custom-label");
		expect(chip).toHaveClass("chip-class", "child-class");
		expect(chip).toHaveTextContent("Read");
	});

	test("removable asChild merges the ref, classes, and slots onto its child", async () => {
		const ref = createRef<HTMLSpanElement>();
		const onRemove = vi.fn<() => void>();
		const { container } = render(
			<Chip asChild ref={ref} className="chip-class" onRemove={onRemove} removeLabel="Remove Read">
				<span className="child-class" data-slot="custom-label">
					Read
				</span>
			</Chip>,
		);
		const chip = container.querySelector('[data-slot~="custom-label"]');
		expect(ref.current).toBe(chip);
		expect(chip).toHaveAttribute("data-slot", "chip custom-label");
		expect(chip).toHaveClass("chip-class", "child-class");
		await userEvent.setup().click(screen.getByRole("button", { name: "Remove Read" }));
		expect(onRemove).toHaveBeenCalledOnce();
	});

	test("removable selectable asChild keeps separate controls inside a container", async () => {
		const ref = createRef<HTMLSpanElement>();
		const onRemove = vi.fn<() => void>();
		const { container } = render(
			<Chip
				selectable
				asChild
				ref={ref}
				className="chip-class"
				onRemove={onRemove}
				removeLabel="Remove Read"
			>
				<span className="child-class" data-slot="custom-chip">
					Read
				</span>
			</Chip>,
		);
		const chip = container.querySelector('[data-slot~="custom-chip"]');
		expect(ref.current).toBe(chip);
		expect(chip).toHaveAttribute("data-slot", "chip custom-chip");
		expect(chip).toHaveClass("chip-class", "child-class");
		const toggle = screen.getByRole("button", { name: "Read" });
		await userEvent.setup().click(toggle);
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		await userEvent.setup().click(screen.getByRole("button", { name: "Remove Read" }));
		expect(onRemove).toHaveBeenCalledOnce();
	});

	test("selectable asChild rejects a link instead of emitting invalid toggle semantics", () => {
		expect(() =>
			render(
				<Chip selectable asChild>
					<a href="/read">Read</a>
				</Chip>,
			),
		).toThrow("A selectable Chip can only wrap a button");
	});

	test("a removable chip cannot put its remove button inside a button", () => {
		expect(() =>
			render(
				<Chip asChild onRemove={() => {}} removeLabel="Remove Read">
					<button type="button">Read</button>
				</Chip>,
			),
		).toThrow("A removable Chip cannot wrap an interactive element");
	});

	test("a translated label can change beside the icon", async () => {
		render(<TranslatedChip />);
		const button = screen.getByRole("button", { name: "Read" });
		translateTextNodes(button);
		await userEvent.setup().click(button);
		expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
		expect(button).toHaveTextContent("Write");
	});

	test("a translated removable label can change beside its remove button", () => {
		const onRemove = vi.fn<() => void>();
		const { container, rerender } = render(
			<Chip onRemove={onRemove} removeLabel="Remove Read">
				Read
			</Chip>,
		);
		const chip = container.querySelector('[data-slot="chip"]');
		if (chip == null) {
			throw new Error("Expected a Chip root");
		}
		translateTextNodes(chip);
		rerender(
			<Chip onRemove={onRemove} removeLabel="Remove Write">
				Write
			</Chip>,
		);
		expect(chip).toHaveTextContent("Write");
	});
});
