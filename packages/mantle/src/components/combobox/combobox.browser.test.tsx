import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Combobox from "./combobox-parts.js";

const domains = ["acme.ngrok.app", "acme.ngrok.dev", "acme.ngrok.io", "zeta.ngrok.app"];

const DomainCombobox = ({
	autoSelect,
	onPick,
}: {
	autoSelect?: boolean;
	onPick?: (value: string) => void;
}) => {
	const [inputValue, setInputValue] = useState("");
	const matches = domains.filter((domain) => domain.includes(inputValue));
	return (
		<>
			<label htmlFor="domain">Domain</label>
			<Combobox.Root
				inputValue={inputValue}
				onInputValueChange={setInputValue}
				onValueChange={onPick}
			>
				<Combobox.Input id="domain" autoSelect={autoSelect} />
				<Combobox.Content>
					{matches.map((domain) => (
						<Combobox.Item key={domain} value={domain}>
							<Combobox.ItemValue />
						</Combobox.Item>
					))}
				</Combobox.Content>
			</Combobox.Root>
		</>
	);
};

const activeOption = (owner: HTMLElement) => {
	const id = owner.getAttribute("aria-activedescendant");
	return id == null ? null : document.getElementById(id);
};

const axeViolations = async () => {
	// Why WCAG tags only: `region` is a best practice for whole pages, and a test page has no landmarks.
	// Why no `target-size`: the test page loads no Tailwind, so an option is one bare line
	// of text. The styled option is 32px tall.
	const results = await axe.run(document.body, {
		resultTypes: ["violations"],
		rules: { "target-size": { enabled: false } },
		runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
	});
	return results.violations.map((violation) => violation.id);
};

describe("Combobox keyboard, focus, and ARIA contract", () => {
	test("a list that CSS caps below the space above sits right above its input", async () => {
		const fruits = Array.from({ length: 50 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 40 }} />
				<Combobox.Content style={{ maxHeight: 100, overflowY: "auto" }}>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(input);
		const listbox = await screen.findByRole("listbox");
		const gap = input.getBoundingClientRect().top - listbox.getBoundingClientRect().bottom;
		expect(gap).toBeCloseTo(8, 0);
	});

	test("a scrolled list keeps its scroll position", async () => {
		const fruits = Array.from({ length: 80 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" />
				<Combobox.Content style={{ maxHeight: "var(--available-height)", overflowY: "auto" }}>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");
		listbox.scrollTop = 300;
		// Why: a page scroll places the list again, which measures it.
		window.dispatchEvent(new Event("scroll"));
		await new Promise((resolve) => {
			requestAnimationFrame(() => requestAnimationFrame(resolve));
		});
		expect(listbox.scrollTop).toBe(300);
	});
	test("a list taller than both sides opens above a low input inside the viewport", async () => {
		const fruits = Array.from({ length: 60 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 40 }} />
				{/* Why the style: this page loads no Tailwind, and the real classes cap the list and size its box the same way. */}
				<Combobox.Content
					style={{
						maxHeight: "var(--available-height)",
						overflowY: "auto",
						boxSizing: "border-box",
					}}
				>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");
		expect(listbox).toHaveAttribute("data-side", "top");
		expect(listbox.getBoundingClientRect().top).toBeGreaterThanOrEqual(8);
	});
	test("typing filters and highlights the first match; arrows move; Enter fills the input", async () => {
		const onPick = vi.fn<(value: string) => void>();
		render(<DomainCombobox onPick={onPick} />);
		const input = screen.getByRole("combobox", { name: "Domain" });
		expect(input).toHaveAttribute("aria-autocomplete", "list");
		expect(input).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(input);
		await userEvent.keyboard("dev");
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
		expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
			"acme.ngrok.dev",
		]);
		expect(activeOption(input)).toHaveTextContent("acme.ngrok.dev");
		expect(document.activeElement).toBe(input);

		await userEvent.keyboard("{Backspace}{Backspace}{Backspace}app");
		expect(activeOption(input)).toHaveTextContent("acme.ngrok.app");
		await userEvent.keyboard("{ArrowDown}");
		expect(activeOption(input)).toHaveTextContent("zeta.ngrok.app");
		await userEvent.keyboard("{Enter}");
		expect(input).toHaveValue("zeta.ngrok.app");
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(onPick).toHaveBeenCalledTimes(1);
		expect(onPick).toHaveBeenLastCalledWith("zeta.ngrok.app");
	});

	test("ArrowDown opens on the first option and ArrowUp on the last", async () => {
		render(<DomainCombobox autoSelect={false} />);
		const input = screen.getByRole("combobox", { name: "Domain" });
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		expect(activeOption(input)).toHaveTextContent("acme.ngrok.app");
		await userEvent.keyboard("{Escape}{ArrowUp}");
		expect(activeOption(input)).toHaveTextContent("zeta.ngrok.app");
	});

	test("with autoSelect off, typing highlights nothing, and Enter inside a form does not submit", async () => {
		const onSubmit = vi.fn<(event: SubmitEvent) => void>((event) => event.preventDefault());
		render(
			<form
				ref={(form) => {
					form?.addEventListener("submit", onSubmit);
				}}
			>
				<DomainCombobox autoSelect={false} />
			</form>,
		);
		const input = screen.getByRole("combobox", { name: "Domain" });
		await userEvent.click(input);
		await userEvent.keyboard("acme");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		await userEvent.keyboard("{Enter}");
		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(input).toHaveValue("acme");
	});

	test("Escape closes the list and keeps the typed text; a press outside closes it", async () => {
		render(<DomainCombobox />);
		const input = screen.getByRole("combobox", { name: "Domain" });
		await userEvent.click(input);
		await userEvent.keyboard("acme");
		expect(activeOption(input)).toHaveRole("option");
		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(input).not.toHaveAttribute("aria-activedescendant");
		expect(input).toHaveValue("acme");
		await userEvent.keyboard("{ArrowDown}");
		expect(input).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(document.body);
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("a pointer press on an option picks it and keeps focus on the input", async () => {
		const onPick = vi.fn<(value: string) => void>();
		render(<DomainCombobox onPick={onPick} />);
		const input = screen.getByRole("combobox", { name: "Domain" });
		await userEvent.click(input);
		await userEvent.click(screen.getByRole("option", { name: "acme.ngrok.io" }));
		expect(onPick).toHaveBeenLastCalledWith("acme.ngrok.io");
		expect(input).toHaveValue("acme.ngrok.io");
		expect(document.activeElement).toBe(input);
	});

	test("inside a Dialog, the first Escape closes only the list and the second closes the dialog", async () => {
		render(
			<Dialog.Root defaultOpen>
				<Dialog.Content>
					<Dialog.Title>Settings</Dialog.Title>
					<DomainCombobox />
				</Dialog.Content>
			</Dialog.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Domain" });
		await userEvent.click(input);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
	});

	test("the open list hides its scrollbar and stops overscroll", async () => {
		// Why the compiled CSS: this page loads no Tailwind, and the test checks the real utilities.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./combobox.tsx");
		document.head.append(style);
		try {
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content>
						<Combobox.Item value="Apple" />
					</Combobox.Content>
				</Combobox.Root>,
			);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const list = await screen.findByRole("listbox");
			expect(getComputedStyle(list)).toMatchObject({
				overflowY: "auto",
				overscrollBehaviorY: "none",
				scrollbarWidth: "none",
			});
		} finally {
			style.remove();
		}
	});

	test("has no axe violations closed or open", async () => {
		render(<DomainCombobox />);
		expect(await axeViolations()).toEqual([]);
		await userEvent.click(screen.getByRole("combobox", { name: "Domain" }));
		await userEvent.keyboard("acme");
		expect(await axeViolations()).toEqual([]);
	});
});
