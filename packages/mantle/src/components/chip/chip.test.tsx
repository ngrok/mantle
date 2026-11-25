import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StarIcon } from "@phosphor-icons/react/Star";
import { createElement, createRef, useState } from "react";
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

	test("appearance defaults to pill and stamps data-appearance on each root", () => {
		render(
			<>
				<Chip data-testid="plain">Read</Chip>
				<Chip selectable appearance="square">
					Write
				</Chip>
			</>,
		);
		expect(screen.getByTestId("plain")).toHaveAttribute("data-appearance", "pill");
		expect(screen.getByRole("button", { name: "Write" })).toHaveAttribute(
			"data-appearance",
			"square",
		);
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

	test("a selectable icon replaces the plus and check icons", async () => {
		render(
			<Chip selectable icon={<StarIcon />}>
				Favorite
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Favorite" });
		expect(button.querySelectorAll("svg")).toHaveLength(1);
		expect(button.querySelector('[data-slot~="chip-icon"]')).toBeInTheDocument();
		await userEvent.setup().click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(button.querySelectorAll("svg")).toHaveLength(1);
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

	test("an aria-disabled chip cannot be toggled", async () => {
		const onPressedChange = vi.fn<(pressed: boolean) => void>();
		render(
			<Chip selectable aria-disabled="true" onPressedChange={onPressedChange}>
				Read
			</Chip>,
		);
		await userEvent.setup().click(screen.getByRole("button", { name: "Read" }));
		expect(onPressedChange).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "false");
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

	test("a selectable asChild chip keeps its pressed and disabled state over the child's props", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Chip selectable asChild defaultPressed disabled>
				<button type="button" aria-pressed={false} disabled={false} onClick={onClick}>
					Read
				</button>
			</Chip>,
		);
		const button = screen.getByRole("button", { name: "Read" });
		await userEvent.setup().click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(button).toBeDisabled();
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a selectable asChild chip does not submit its form", async () => {
		const onSubmit = vi.fn<() => void>();
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit();
				}}
			>
				<Chip selectable asChild>
					<button type="submit">Read</button>
				</Chip>
			</form>,
		);
		const button = screen.getByRole("button", { name: "Read" });
		expect(button).toHaveAttribute("type", "button");
		await userEvent.setup().click(button);
		expect(button).toHaveAttribute("aria-pressed", "true");
		expect(onSubmit).not.toHaveBeenCalled();
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

	test("selectable asChild rejects a link instead of emitting invalid toggle semantics", () => {
		expect(() =>
			render(
				<Chip selectable asChild>
					<a href="/read">Read</a>
				</Chip>,
			),
		).toThrow("A selectable Chip can only wrap a button");
	});

	// Why a label: it forwards a click on the value text to the remove button inside it.
	test.each(["button", "label"])("a removable chip cannot wrap a %s", (tag) => {
		expect(() =>
			render(
				<Chip asChild onRemove={() => {}} removeLabel="Remove Read">
					{createElement(tag, null, "Read")}
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

	test("a translated removable label can change beside its remove button", async () => {
		function Subject() {
			const [label, setLabel] = useState("Read");
			return (
				<>
					<Chip onRemove={() => {}} removeLabel={`Remove ${label}`}>
						{label}
					</Chip>
					<button type="button" onClick={() => setLabel("Write")}>
						Change label
					</button>
				</>
			);
		}
		const { container } = render(<Subject />);
		const chip = container.querySelector('[data-slot="chip"]');
		if (chip == null) {
			throw new Error("Expected a Chip root");
		}
		translateTextNodes(chip);
		await userEvent.setup().click(screen.getByRole("button", { name: "Change label" }));
		expect(chip).toHaveTextContent("Write");
		expect(screen.getByRole("button", { name: "Remove Write" })).toBeInTheDocument();
	});
});
