import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import type { UIEvent } from "react";
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
		const content = (await screen.findByRole("listbox")).closest("[popover]");
		const gap = input.getBoundingClientRect().top - (content?.getBoundingClientRect().bottom ?? 0);
		expect(gap).toBeCloseTo(8, 0);
	});

	test("a scrolled list keeps its scroll position", async () => {
		// Why the compiled CSS: the real classes cap the list and scroll its viewport.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./combobox.tsx");
		document.head.append(style);
		try {
			const fruits = Array.from({ length: 80 }, (_, index) => `Fruit ${index}`);
			const onScroll = vi.fn<(event: UIEvent<HTMLDivElement>) => void>();
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content onScroll={onScroll}>
						{fruits.map((fruit) => (
							<Combobox.Item key={fruit} value={fruit} />
						))}
					</Combobox.Content>
				</Combobox.Root>,
			);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const viewport = await screen.findByRole("listbox");
			viewport.scrollTop = 300;
			// Why: a page scroll places the list again, which measures it.
			window.dispatchEvent(new Event("scroll"));
			await new Promise((resolve) => {
				requestAnimationFrame(() => requestAnimationFrame(resolve));
			});
			expect(viewport.scrollTop).toBe(300);
			// Why: a Content `onScroll`, such as one that loads the next page, hears the viewport.
			expect(onScroll).toHaveBeenCalledTimes(1);
			expect(onScroll).toHaveBeenLastCalledWith(expect.objectContaining({ type: "scroll" }));
		} finally {
			style.remove();
		}
	});
	test("a list that grows past both sides moves above a low input", async () => {
		// Why the compiled CSS: the side choice measures the content of the viewport that scrolls.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./combobox.tsx");
		document.head.append(style);
		try {
			const Growing = ({ count }: { count: number }) => (
				<Combobox.Root>
					<Combobox.Input
						aria-label="Fruit"
						style={{ position: "fixed", top: "60%", height: 30 }}
					/>
					{/* Why the style: the page loads no preflight, which sizes every box by its border. */}
					<Combobox.Content style={{ boxSizing: "border-box" }}>
						{Array.from({ length: count }, (_, index) => (
							<Combobox.Item key={index} value={`Fruit ${index}`} />
						))}
					</Combobox.Content>
				</Combobox.Root>
			);
			const { rerender } = render(<Growing count={2} />);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const content = (await screen.findByRole("listbox")).closest("[popover]");
			expect(content).toHaveAttribute("data-side", "bottom");
			// Why: the list capped below now holds more than fits there, and more room is above.
			rerender(<Growing count={200} />);
			// Why a poll: the resize observer places the list again in a later frame.
			await expect.poll(() => content?.getAttribute("data-side")).toBe("top");
			// Why 7.5: the input's top sits at a fraction of a pixel.
			expect(content?.getBoundingClientRect().top).toBeGreaterThanOrEqual(7.5);
		} finally {
			style.remove();
		}
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

	test("the open list scrolls in a faded viewport with no scrollbar or overscroll", async () => {
		// Why the compiled CSS: this page loads no Tailwind, and the test checks the real utilities.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./combobox.tsx");
		document.head.append(style);
		try {
			render(
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					<Combobox.Content style={{ maxHeight: 120 }}>
						{Array.from({ length: 30 }, (_, index) => (
							<Combobox.Item key={index} value={`Fruit ${index}`} />
						))}
					</Combobox.Content>
				</Combobox.Root>,
			);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const viewport = await screen.findByRole("listbox");
			expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
			// Why with a list that scrolls: axe exempts a scrolling listbox that a combobox controls, not a scroller inside one.
			expect(await axeViolations()).toEqual([]);
			const list = viewport.closest("[popover]") ?? viewport;
			expect(viewport).toHaveAttribute("data-slot", "combobox-viewport");
			expect(getComputedStyle(viewport)).toMatchObject({
				overflowY: "auto",
				overscrollBehaviorY: "none",
				scrollbarWidth: "none",
				maskImage: expect.stringContaining("linear-gradient"),
			});
			// Why: the fade masks only the listbox viewport, so the popup's border and shadow stay whole.
			expect(getComputedStyle(list).maskImage).toBe("none");
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
