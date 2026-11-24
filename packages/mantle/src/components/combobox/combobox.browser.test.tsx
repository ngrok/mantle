import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, onTestFinished, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Popover from "../popover/popover-parts.js";
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

/** The positioned popup box that holds the listbox and the footer. */
const popupOf = (listbox: HTMLElement): HTMLElement => {
	const popup = listbox.closest<HTMLElement>('[data-slot="combobox-popup"]');
	if (popup == null) {
		throw new Error("The listbox has no popup box.");
	}
	return popup;
};

/** Loads the compiled classes of combobox.tsx, so the box caps the listbox and the listbox scrolls. */
const injectComboboxCss = async () => {
	const style = document.createElement("style");
	style.textContent = await commands.tailwindCss("./combobox.tsx");
	document.head.append(style);
	onTestFinished(() => style.remove());
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
		await injectComboboxCss();
		const fruits = Array.from({ length: 50 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 40 }} />
				<Combobox.Content style={{ maxHeight: 100 }}>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(input);
		const listbox = await screen.findByRole("listbox");
		const gap = input.getBoundingClientRect().top - popupOf(listbox).getBoundingClientRect().bottom;
		expect(gap).toBeCloseTo(8, 0);
	});

	test("a scrolled list keeps its scroll position", async () => {
		await injectComboboxCss();
		const fruits = Array.from({ length: 80 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" />
				<Combobox.Content>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");
		const popup = popupOf(listbox);
		listbox.scrollTop = 300;
		// Why: a new input width places the list again, which measures it. Each
		// placement writes `data-side`, so its return marks the placement's end.
		delete popup.dataset.side;
		const input = screen.getByRole("combobox", { name: "Fruit" });
		input.style.width = `${input.offsetWidth + 1}px`;
		await expect.poll(() => popup.dataset.side).toBe("bottom");
		expect(listbox.scrollTop).toBe(300);
	});
	test("a list taller than both sides opens above a low input inside the viewport", async () => {
		await injectComboboxCss();
		const fruits = Array.from({ length: 60 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 40 }} />
				<Combobox.Content>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");
		expect(popupOf(listbox)).toHaveAttribute("data-side", "top");
		expect(popupOf(listbox).getBoundingClientRect().top).toBeGreaterThanOrEqual(8);
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

	test("the edge cue follows the options when a filter changes them", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./combobox.tsx");
		document.head.append(style);
		try {
			const Filtered = ({ count }: { count: number }) => (
				<Combobox.Root>
					<Combobox.Input aria-label="Fruit" />
					{/* Why the style: the compiled CSS holds only the classes in combobox.tsx. */}
					<Combobox.Content style={{ maxHeight: 120 }}>
						{Array.from({ length: count }, (_, index) => (
							<Combobox.Item key={index} value={`Fruit ${index}`} />
						))}
					</Combobox.Content>
				</Combobox.Root>
			);
			const { rerender } = render(<Filtered count={30} />);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const list = screen.getByRole("listbox");
			const edges = () =>
				[list.hasAttribute("data-overflow-top"), list.hasAttribute("data-overflow-bottom")].join();
			await expect.poll(edges).toBe("false,true");
			list.scrollTop = 200;
			await expect.poll(edges).toBe("true,true");
			// Why: the list no longer scrolls, so neither edge has more options.
			rerender(<Filtered count={2} />);
			await expect.poll(edges).toBe("false,false");
		} finally {
			style.remove();
		}
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

	test("a footer sits after the listbox: Tab reaches it, the list stays open, and axe finds no violation", async () => {
		render(
			<>
				<label htmlFor="release">Release</label>
				<Combobox.Root>
					<Combobox.Input id="release" />
					<Combobox.Content>
						<Combobox.Item value="v1.2.0" />
						<Combobox.Item value="v1.1.0" />
						<Combobox.ContentFooter>
							<button type="button">Load more</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
				<button type="button">Next field</button>
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });

		await userEvent.click(input);
		await userEvent.keyboard("{Tab}");
		const loadMore = screen.getByRole("button", { name: "Load more" });
		expect(loadMore).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(await axeViolations()).toEqual([]);

		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("a footer control that turns disabled returns focus to the input and keeps the list open", async () => {
		const LoadMore = () => {
			const [loading, setLoading] = useState(false);
			return (
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content>
						<Combobox.Item value="v1.2.0" />
						<Combobox.ContentFooter>
							<button type="button" disabled={loading} onClick={() => setLoading(true)}>
								Load more
							</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
			);
		};
		render(<LoadMore />);
		const input = screen.getByRole("combobox", { name: "Release" });

		await userEvent.click(input);
		await userEvent.keyboard("{Tab}{Enter}");

		expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
		await expect.poll(() => document.activeElement).toBe(input);
		expect(input).toHaveAttribute("aria-expanded", "true");
	});

	test("a footer control that unmounts while it has focus returns focus to the input", async () => {
		const LoadMore = () => {
			const [done, setDone] = useState(false);
			return (
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content>
						<Combobox.Item value="v1.2.0" />
						<Combobox.ContentFooter>
							{!done && (
								<button type="button" onClick={() => setDone(true)}>
									Load more
								</button>
							)}
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
			);
		};
		render(<LoadMore />);
		const input = screen.getByRole("combobox", { name: "Release" });

		await userEvent.click(input);
		await userEvent.keyboard("{Tab}{Enter}");

		expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
		await expect.poll(() => document.activeElement).toBe(input);
		expect(input).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("a press on a footer button runs it and keeps focus on the input; a footer text field takes focus", async () => {
		const onLoadMore = vi.fn<() => void>();
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Release" />
				<Combobox.Content>
					<Combobox.Item value="v1.2.0" />
					<Combobox.ContentFooter>
						<button type="button" onClick={onLoadMore}>
							Load more
						</button>
						<input aria-label="Tag filter" />
					</Combobox.ContentFooter>
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });

		await userEvent.click(input);
		await userEvent.click(screen.getByRole("button", { name: "Load more" }));
		expect(onLoadMore).toHaveBeenCalledTimes(1);
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");

		await userEvent.click(screen.getByRole("textbox", { name: "Tag filter" }));
		expect(screen.getByRole("textbox", { name: "Tag filter" })).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
	});

	test("a pick by pointer while focus is in the footer returns focus to the input", async () => {
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Release" />
				<Combobox.Content>
					<Combobox.Item value="v1.2.0" />
					<Combobox.ContentFooter>
						<button type="button">Load more</button>
					</Combobox.ContentFooter>
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });

		await userEvent.click(input);
		await userEvent.keyboard("{Tab}");
		await userEvent.click(screen.getByRole("option", { name: "v1.2.0" }));

		expect(input).toHaveValue("v1.2.0");
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(input).toHaveFocus();
	});

	test("a click on a control outside the open list runs that control", async () => {
		const onSubmit = vi.fn<(event: SubmitEvent) => void>((event) => event.preventDefault());
		render(
			<form
				ref={(form) => {
					form?.addEventListener("submit", onSubmit);
				}}
			>
				<DomainCombobox autoSelect={false} />
				<button type="submit">Save</button>
			</form>,
		);
		const input = screen.getByRole("combobox", { name: "Domain" });

		await userEvent.click(input);
		expect(input).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("a wider Content is not clipped by the popup", async () => {
		await injectComboboxCss();
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ width: 200 }} />
				<Combobox.Content style={{ width: 384 }}>
					<Combobox.Item value="Apple" />
				</Combobox.Content>
			</Combobox.Root>,
		);

		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");

		const popup = popupOf(listbox).getBoundingClientRect();
		expect(popup.width).toBeGreaterThan(384);
		expect(popup.right).toBeGreaterThanOrEqual(listbox.getBoundingClientRect().right);
	});
	test("with no footer, the highlighted option shows inside the scrolled listbox", async () => {
		await injectComboboxCss();
		const fruits = Array.from({ length: 30 }, (_, index) => `Fruit ${index}`);
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" style={{ marginTop: 48 }} />
				<Combobox.Content style={{ maxHeight: 120 }}>
					{fruits.map((fruit) => (
						<Combobox.Item key={fruit} value={fruit} />
					))}
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(input);
		const listbox = await screen.findByRole("listbox");
		await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
		const option = activeOption(input);
		expect(option).not.toBeNull();
		const list = listbox.getBoundingClientRect();
		const rect = option?.getBoundingClientRect();
		expect(rect?.top).toBeGreaterThanOrEqual(list.top - 1);
		expect(rect?.bottom).toBeLessThanOrEqual(list.bottom + 1);
	});

	test("a list that grows after it opens moves to the side with more room", async () => {
		await injectComboboxCss();
		const Growing = () => {
			const [count, setCount] = useState(1);
			return (
				<Combobox.Root onInputValueChange={() => setCount(40)}>
					<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 120 }} />
					<Combobox.Content>
						{Array.from({ length: count }, (_, index) => (
							<Combobox.Item key={index} value={`Fruit ${index}`} />
						))}
					</Combobox.Content>
				</Combobox.Root>
			);
		};
		render(<Growing />);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const listbox = await screen.findByRole("listbox");
		expect(popupOf(listbox)).toHaveAttribute("data-side", "bottom");
		await userEvent.keyboard("F");
		await expect.poll(() => popupOf(listbox).dataset.side).toBe("top");
	});

	test("a footer never makes the popup wider than its input", async () => {
		await injectComboboxCss();
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Release" style={{ width: 160 }} />
				<Combobox.Content>
					<Combobox.Item value="v1.2.0" />
					<Combobox.ContentFooter>
						<button type="button">Load more</button>
						<input aria-label="Tag filter" />
					</Combobox.ContentFooter>
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		const listbox = await screen.findByRole("listbox");
		// Why against the listbox: the listbox takes the input's width, and the footer takes the popup's.
		const footer = screen.getByRole("button", { name: "Load more" }).parentElement;
		expect(footer?.getBoundingClientRect().width).toBeCloseTo(
			listbox.getBoundingClientRect().width,
			0,
		);
	});

	test("inside a Popover, Escape from a footer control closes only the list", async () => {
		render(
			<Popover.Root defaultOpen>
				<Popover.Trigger>Filters</Popover.Trigger>
				<Popover.Content>
					<Combobox.Root>
						<Combobox.Input aria-label="Release" />
						<Combobox.Content>
							<Combobox.Item value="v1.2.0" />
							<Combobox.ContentFooter>
								<button type="button">Load more</button>
							</Combobox.ContentFooter>
						</Combobox.Content>
					</Combobox.Root>
				</Popover.Content>
			</Popover.Root>,
		);
		const input = await screen.findByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		await userEvent.keyboard("{Tab}");
		expect(screen.getByRole("button", { name: "Load more" })).toHaveFocus();
		await userEvent.keyboard("{Escape}");

		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(input).toHaveFocus();
		expect(screen.getByRole("button", { name: "Filters" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});

	test("an Escape that an input method composes in a footer text field keeps the list open", async () => {
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Release" />
				<Combobox.Content>
					<Combobox.Item value="v1.2.0" />
					<Combobox.ContentFooter>
						<input aria-label="Tag filter" />
					</Combobox.ContentFooter>
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		const field = screen.getByRole("textbox", { name: "Tag filter" });
		await userEvent.click(field);
		field.dispatchEvent(
			new KeyboardEvent("keydown", {
				key: "Escape",
				isComposing: true,
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(field).toHaveFocus();
	});

	test("Content's onBlur can cancel the close when focus leaves the footer", async () => {
		render(
			<>
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content onBlur={(event) => event.preventDefault()}>
						<Combobox.Item value="v1.2.0" />
						<Combobox.ContentFooter>
							<button type="button">Load more</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
				<button type="button">Elsewhere</button>
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		await userEvent.keyboard("{Tab}");
		await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
		expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
	});
	test("inside a Dialog, a composing Escape in the input or a footer field keeps the dialog open", async () => {
		render(
			<Dialog.Root defaultOpen>
				<Dialog.Content>
					<Dialog.Title>Settings</Dialog.Title>
					<Combobox.Root>
						<Combobox.Input aria-label="Release" />
						<Combobox.Content>
							<Combobox.Item value="v1.2.0" />
							<Combobox.ContentFooter>
								<input aria-label="Tag filter" />
							</Combobox.ContentFooter>
						</Combobox.Content>
					</Combobox.Root>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const composingEscape = () =>
			new KeyboardEvent("keydown", {
				key: "Escape",
				isComposing: true,
				bubbles: true,
				cancelable: true,
			});
		const input = screen.getByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		input.dispatchEvent(composingEscape());
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();

		const field = screen.getByRole("textbox", { name: "Tag filter" });
		await userEvent.click(field);
		field.dispatchEvent(composingEscape());
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
		expect(input).toHaveAttribute("aria-expanded", "true");
	});

	test("Content's onBlur can cancel the close when Tab leaves the footer", async () => {
		render(
			<>
				<Combobox.Root>
					<Combobox.Input aria-label="Release" />
					<Combobox.Content onBlur={(event) => event.preventDefault()}>
						<Combobox.Item value="v1.2.0" />
						<Combobox.ContentFooter>
							<button type="button">Load more</button>
						</Combobox.ContentFooter>
					</Combobox.Content>
				</Combobox.Root>
				<button type="button">Next field</button>
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Release" });
		await userEvent.click(input);
		await userEvent.keyboard("{Tab}{Tab}");
		expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
	});

	test("an asChild list that is replaced while open still moves to the side with more room", async () => {
		await injectComboboxCss();
		const Replaced = () => {
			const [count, setCount] = useState(1);
			return (
				<Combobox.Root onInputValueChange={() => setCount(40)}>
					<Combobox.Input aria-label="Fruit" style={{ position: "fixed", bottom: 120 }} />
					<Combobox.Content asChild>
						<section key={count}>
							{Array.from({ length: count }, (_, index) => (
								<Combobox.Item key={index} value={`Fruit ${index}`} />
							))}
						</section>
					</Combobox.Content>
				</Combobox.Root>
			);
		};
		render(<Replaced />);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		const popup = popupOf(await screen.findByRole("listbox"));
		expect(popup).toHaveAttribute("data-side", "bottom");
		await userEvent.keyboard("F");
		await expect.poll(() => popup.dataset.side).toBe("top");
	});
});
