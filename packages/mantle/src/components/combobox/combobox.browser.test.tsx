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
const injectComboboxCss = async (options?: { theme?: boolean }) => {
	const style = document.createElement("style");
	style.textContent = await commands.tailwindCss("./combobox.tsx", options);
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
	test("the typed match keeps the option text width and the option name, and shows a line", async () => {
		// Why the theme: without it, `--color-accent-600` is unset and the line draws nothing,
		// and a type-scale weight compiles to nothing.
		await injectComboboxCss({ theme: true });
		render(
			<Combobox.Root>
				<Combobox.Input aria-label="Domain" />
				<Combobox.Content>
					<Combobox.Item value="https://acme.ngrok.app">
						<Combobox.ItemValue />
					</Combobox.Item>
				</Combobox.Content>
			</Combobox.Root>,
		);
		const input = screen.getByRole("combobox", { name: "Domain" });
		await userEvent.click(input);
		const option = await screen.findByRole("option", { name: "https://acme.ngrok.app" });
		const slice = (selector: string) => {
			const element = option.querySelector(selector);
			if (element == null) {
				throw new Error(`The option has no ${selector} slice.`);
			}
			return element;
		};
		// Why a range: the value span grows to fill the row, and the range measures only its text.
		const textWidth = () => {
			const text = document.createRange();
			text.selectNodeContents(slice('[data-slot="combobox-item-value"]'));
			return text.getBoundingClientRect().width;
		};
		// Why the computed font too: the test fonts have no 500 face, so a medium weight
		// draws at 400 here and keeps the width. Roobert in the product draws it wider.
		const glyphs = (selector: string) => {
			const style = getComputedStyle(slice(selector));
			return [style.font, style.letterSpacing, style.fontVariationSettings];
		};
		const plainWidth = textWidth();
		const plainGlyphs = glyphs("[data-autocomplete-value]");

		await userEvent.type(input, "https://");
		expect(slice("[data-user-value]")).toHaveTextContent("https://");
		// Why close and not equal: the cut between slices can drop a kerning pair, under 0.05px.
		expect(textWidth()).toBeCloseTo(plainWidth, 1);
		expect(glyphs("[data-user-value]")).toEqual(plainGlyphs);
		expect(glyphs("[data-autocomplete-value]")).toEqual(plainGlyphs);
		// Why a poll: the line transitions in.
		const drawsLine = (selector: string) => {
			const style = getComputedStyle(slice(selector));
			return (
				style.backgroundImage.startsWith("linear-gradient") &&
				style.backgroundSize === "100% 2px" &&
				style.backgroundPositionY === "100%"
			);
		};
		await expect.poll(() => drawsLine("[data-user-value]")).toBe(true);
		expect(option).toHaveAccessibleName("https://acme.ngrok.app");

		// Why the old match keeps its own span: its line must stay on the same text while it transitions out.
		const match = slice("[data-user-value]");
		await userEvent.type(input, "x");
		expect(match.textContent).toBe("https://");
		expect(match).not.toHaveAttribute("data-user-value");
		await expect.poll(() => getComputedStyle(match).backgroundSize).toBe("0px 2px");
		expect(textWidth()).toBeCloseTo(plainWidth, 1);
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
	test("a Tab into the input opens the list as a click does; focus from script, a pick, and Escape do not", async () => {
		render(
			<>
				<button type="button">Before</button>
				<DomainCombobox />
			</>,
		);
		const input = screen.getByRole("combobox", { name: "Domain" });
		input.focus();
		expect(input).toHaveAttribute("aria-expanded", "false");
		screen.getByRole("button", { name: "Before" }).focus();

		await userEvent.keyboard("{Tab}");
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(activeOption(input)).toHaveTextContent("acme.ngrok.app");

		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		await userEvent.keyboard("{Tab}");
		expect(input).toHaveAttribute("aria-expanded", "true");

		await userEvent.keyboard("{Enter}");
		expect(input).toHaveValue("acme.ngrok.app");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});

	test("Shift+Tab from the footer back to the input keeps the list open", async () => {
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
		await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
		expect(input).toHaveFocus();
		expect(input).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		expect(input).toHaveAttribute("aria-expanded", "false");
	});
	test("a Tab that the input's onKeyDown cancels opens nothing; an Option+Tab entry opens the list", async () => {
		render(
			<>
				<Combobox.Root>
					<Combobox.Input
						aria-label="Release"
						onKeyDown={(event) => {
							if (event.key === "Tab") {
								event.preventDefault();
							}
						}}
					/>
					<Combobox.Content>
						<Combobox.Item value="v1.2.0" />
					</Combobox.Content>
				</Combobox.Root>
				<Combobox.Root>
					<Combobox.Input aria-label="Region" />
					<Combobox.Content>
						<Combobox.Item value="us-east-1" />
					</Combobox.Content>
				</Combobox.Root>
			</>,
		);
		const release = screen.getByRole("combobox", { name: "Release" });
		release.focus();
		await userEvent.keyboard("{Tab}");
		expect(release).toHaveFocus();
		expect(release).toHaveAttribute("aria-expanded", "false");

		// Why a dispatched keyup: only Safari moves focus on Option+Tab, and its keyup lands on the field.
		const region = screen.getByRole("combobox", { name: "Region" });
		region.focus();
		region.dispatchEvent(new KeyboardEvent("keyup", { key: "Tab", altKey: true, bubbles: true }));
		await expect.poll(() => region.getAttribute("aria-expanded")).toBe("true");
	});
});
