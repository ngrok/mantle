import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog.js";
import { isDialogOverlayTarget } from "./primitive.js";

type DialogAppearance = "centered" | "full-page" | "full-bleed";

async function open(appearance: DialogAppearance = "centered") {
	const user = userEvent.setup();
	render(
		<Dialog.Root>
			<Dialog.Trigger asChild>
				<button type="button">Open</button>
			</Dialog.Trigger>
			<Dialog.Content appearance={appearance}>
				<Dialog.Header>
					<Dialog.Title>Request log</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Body>Body</Dialog.Body>
			</Dialog.Content>
		</Dialog.Root>,
	);
	await user.click(screen.getByRole("button", { name: "Open" }));

	const content = await screen.findByRole("dialog");
	const wrapper = content.parentElement;
	if (!(wrapper instanceof HTMLElement)) {
		throw new Error("dialog content wrapper not found");
	}
	return { content, user, wrapper };
}

describe("Dialog.Content", () => {
	describe("appearance", () => {
		it("defaults to centered and reflects it on data-appearance", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root>
					<Dialog.Trigger asChild>
						<button type="button">Open</button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			expect(content.dataset.appearance).toBe("centered");
			expect(content.dataset.slot).toBe("dialog-content");
		});

		it.each([
			{ appearance: "centered", inset: "inset-4" },
			{ appearance: "full-page", inset: "inset-4" },
			{ appearance: "full-bleed", inset: "inset-0" },
		] as const)(
			"positions $appearance content at $inset and reflects the appearance",
			async ({ appearance, inset }) => {
				const { content, wrapper } = await open(appearance);

				expect(content.dataset.appearance).toBe(appearance);
				// Cross-element pin: the appearance decides the wrapper's inset, and the
				// wrapper takes no props, so this pairing is observable nowhere else.
				// happy-dom reports zero geometry, so assert the class.
				expect(wrapper.className).toContain(inset);
			},
		);

		it("caps a centered dialog at preferredWidth and drops the default", async () => {
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content preferredWidth="max-w-2xl">
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			// Why the class assertion: `preferredWidth` is itself a `max-w-*` class and emits
			// no data attribute. tailwind-merge keeps one `max-w-*`, so the cap's presence also
			// proves the `max-w-lg` default is gone.
			expect(content.className).toContain("max-w-2xl");
		});

		it("lets a consumer max-w className beat preferredWidth", async () => {
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content className="max-w-3xl" preferredWidth="max-w-sm">
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			// tailwind-merge override contract: `className` merges after `preferredWidth`,
			// so exactly one `max-w-*` survives and it is the consumer's.
			const maxWidthClasses = Array.from(content.classList).filter((token) =>
				token.startsWith("max-w-"),
			);
			expect(maxWidthClasses).toEqual(["max-w-3xl"]);
		});

		it.each(["full-page", "full-bleed"] as const)(
			"uncaps the width for %s, which accepts no preferredWidth",
			async (appearance) => {
				const { content } = await open(appearance);

				// Why the class assertion: the width uncap emits no data attribute. tailwind-merge
				// keeps one `max-w-*`, so the presence of `max-w-none` also pins the centered-only
				// `max-w-lg` guard.
				expect(content.className).toContain("max-w-none");
			},
		);

		it.each(["centered", "full-page"] as const)(
			"paints %s with rounded corners and a border",
			async (appearance) => {
				const { content } = await open(appearance);

				// Why the class assertion: the radius and border emit no data attribute.
				// happy-dom computes no styles for them either.
				expect(content).toHaveClass("rounded-xl", "border-dialog");
			},
		);

		it("keeps one overlay at full bleed so the zoom-in animation has a backdrop", async () => {
			await open("full-bleed");

			expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(1);
		});

		it("lets a consumer className beat the appearance defaults", async () => {
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content appearance="full-page" className="rounded-lg">
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			// tailwind-merge override contract: the consumer's `rounded-lg` beats the table's
			// `rounded-xl` because `className` merges last.
			expect(content).toHaveClass("rounded-lg");
		});
	});

	describe("dismissal", () => {
		it("closes on the close icon button", async () => {
			const { user } = await open("full-bleed");

			await user.click(screen.getByRole("button", { name: "Close Dialog" }));

			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("closes on Escape", async () => {
			const { user } = await open("full-page");

			await user.keyboard("{Escape}");

			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("names the close icon button from its label prop", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
						<Dialog.CloseIconButton label="Dismiss" />
					</Dialog.Content>
				</Dialog.Root>,
			);

			await screen.findByRole("dialog");
			expect(screen.queryByRole("button", { name: "Close Dialog" })).toBeNull();

			await user.click(screen.getByRole("button", { name: "Dismiss" }));

			expect(screen.queryByRole("dialog")).toBeNull();
		});

		it("runs a consumer onEscapeKeyDown with an unprevented event and still closes", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn<(open: boolean) => void>();
			// Radix prevents the event itself once it decides to dismiss, so the flag
			// is sampled while the handler runs, not from `mock.lastCall`.
			const preventedWhenCalled: boolean[] = [];
			const onEscapeKeyDown = vi.fn<(event: KeyboardEvent) => void>((event) => {
				preventedWhenCalled.push(event.defaultPrevented);
			});
			render(
				<Dialog.Root defaultOpen onOpenChange={onOpenChange}>
					<Dialog.Content onEscapeKeyDown={onEscapeKeyDown}>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);
			await screen.findByRole("dialog");

			await user.keyboard("{Escape}");

			expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
			expect(onEscapeKeyDown.mock.lastCall?.[0].key).toBe("Escape");
			expect(preventedWhenCalled).toEqual([false]);
			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenLastCalledWith(false);
			expect(screen.queryByRole("dialog")).toBeNull();
		});
	});

	describe("props", () => {
		it("forwards ref and arbitrary props to the dialog element", async () => {
			const ref = createRef<HTMLDivElement>();
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content id="request-log" data-flavor="primary" ref={ref}>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			expect(content).toHaveAttribute("id", "request-log");
			expect(content).toHaveAttribute("data-flavor", "primary");
			expect(ref.current).toBe(content);
		});
	});

	describe("accessible description", () => {
		it("carries no aria-describedby when no Description is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root>
					<Dialog.Trigger asChild>
						<button type="button">Open</button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			expect(content).not.toHaveAttribute("aria-describedby");
		});

		it("points aria-describedby at the Description when one is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root>
					<Dialog.Trigger asChild>
						<button type="button">Open</button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
						<Dialog.Description>Every request from the last hour.</Dialog.Description>
					</Dialog.Content>
				</Dialog.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			const description = screen.getByText("Every request from the last hour.");
			expect(description.id).not.toBe("");
			expect(content).toHaveAttribute("aria-describedby", description.id);
			expect(content).toHaveAccessibleDescription("Every request from the last hour.");
		});

		it("keeps a consumer-supplied aria-describedby", async () => {
			// Content spreads its props after the Radix value, so a consumer id must
			// survive the spread instead of being replaced by `undefined`.
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content aria-describedby="external-help">
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			expect(content).toHaveAttribute("aria-describedby", "external-help");
		});

		it("Description asChild renders the consumer's element and keeps the described-by id", async () => {
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
						<Dialog.Description asChild className="consumer-description">
							<p data-testid="description">Every request from the last hour.</p>
						</Dialog.Description>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			const description = screen.getByTestId("description");
			expect(description.tagName).toBe("P");
			expect(description).toHaveAttribute("data-slot", "dialog-description");
			expect(description).toHaveClass("consumer-description");
			expect(content).toHaveAttribute("aria-describedby", description.id);
			expect(content).toHaveAccessibleDescription("Every request from the last hour.");
		});
	});

	describe("data-slot", () => {
		it("stamps every part, joined where the close button wraps IconButton", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root>
					<Dialog.Trigger asChild>
						<button type="button">Open</button>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Request log</Dialog.Title>
							<Dialog.Description>Every request from the last hour.</Dialog.Description>
							<Dialog.CloseIconButton />
						</Dialog.Header>
						<Dialog.Body>Body</Dialog.Body>
						<Dialog.Footer>
							<Dialog.Close>Cancel</Dialog.Close>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>,
			);

			// `asChild` moves the slot onto the consumer's button.
			const trigger = screen.getByRole("button", { name: "Open" });
			expect(trigger.dataset.slot).toBe("dialog-trigger");
			await user.click(trigger);

			const content = await screen.findByRole("dialog");
			const title = screen.getByRole("heading", { name: "Request log" });
			const parts = [
				{ element: content, slot: "dialog-content" },
				{ element: content.parentElement, slot: "dialog-positioner" },
				{ element: title, slot: "dialog-title" },
				// `Dialog.Header` lays out its direct children by these slots, so a rename
				// here also breaks the stack the browser test measures.
				{ element: title.parentElement, slot: "dialog-header" },
				{
					element: screen.getByText("Every request from the last hour."),
					slot: "dialog-description",
				},
				{
					element: screen.getByRole("button", { name: "Close Dialog" }),
					slot: "dialog-close-icon-button icon-button",
				},
				{ element: screen.getByText("Body"), slot: "dialog-body" },
				{ element: screen.getByRole("button", { name: "Cancel" }), slot: "dialog-close" },
				{
					element: screen.getByRole("button", { name: "Cancel" }).parentElement,
					slot: "dialog-footer",
				},
			];
			for (const { element, slot } of parts) {
				expect(element).toHaveAttribute("data-slot", slot);
			}
			expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(1);
		});
	});
});

describe("isDialogOverlayTarget", () => {
	it("is true for the element Dialog.Overlay renders", async () => {
		await open();

		// Both sides of the contract in one test: the overlay stamps the attribute
		// the guard reads, so a rename of either alone turns this red.
		const overlay = document.querySelector('[data-slot="dialog-overlay"]');
		expect(overlay).toBeInstanceOf(HTMLElement);
		expect(isDialogOverlayTarget(overlay)).toBe(true);
	});

	it("is false for the content, its positioner, and non-element targets", async () => {
		const { content, wrapper } = await open();

		expect(isDialogOverlayTarget(content)).toBe(false);
		expect(isDialogOverlayTarget(wrapper)).toBe(false);
		expect(
			isDialogOverlayTarget(document.createElementNS("http://www.w3.org/2000/svg", "svg")),
		).toBe(false);
		expect(isDialogOverlayTarget(document)).toBe(false);
		expect(isDialogOverlayTarget(null)).toBe(false);
	});
});

/**
 * A nested popup owner inside a dialog, like a combobox or an input-attached
 * popover: an `aria-expanded` + `aria-controls` trigger paired with the popup it
 * controls. `popupAttributes` stands in for the open-state attribute each
 * library stamps on its popup, Ariakit `data-open` or Radix `data-state`.
 */
function NestedPopupDialog({
	controlsId = "nested-popup",
	expanded = true,
	onEscapeKeyDown,
	onOpenChange,
	popupAttributes,
}: {
	/** Lets a test point `aria-controls` at an id the popup does not have. */
	controlsId?: string;
	expanded?: boolean;
	onEscapeKeyDown?: (event: KeyboardEvent) => void;
	onOpenChange?: (open: boolean) => void;
	popupAttributes?: Record<string, string>;
}) {
	return (
		<Dialog.Root defaultOpen onOpenChange={onOpenChange}>
			<Dialog.Content onEscapeKeyDown={onEscapeKeyDown}>
				<Dialog.Title>Request log</Dialog.Title>
				<button aria-controls={controlsId} aria-expanded={expanded} type="button">
					Region
				</button>
				<div id="nested-popup" role="listbox" {...popupAttributes} />
			</Dialog.Content>
		</Dialog.Root>
	);
}

describe("Escape with a nested popup open", () => {
	// The real integrations run in `multi-select.browser.test.tsx`. These pin each
	// conjunct of the guard with a synthetic popup, so a dropped check turns red
	// without Chromium.
	const openPopups: Array<{ library: string; popupAttributes: Record<string, string> }> = [
		{ library: "ariakit", popupAttributes: { "data-open": "true" } },
		{ library: "radix", popupAttributes: { "data-state": "open" } },
	];
	it.each(openPopups)(
		"stays open while an expanded owner controls an open $library popup",
		async ({ popupAttributes }) => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn<(open: boolean) => void>();
			render(<NestedPopupDialog onOpenChange={onOpenChange} popupAttributes={popupAttributes} />);
			await screen.findByRole("dialog");
			screen.getByRole("button", { name: "Region" }).focus();

			await user.keyboard("{Escape}");

			expect(onOpenChange).toHaveBeenCalledTimes(0);
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		},
	);

	const closingCases: Array<{ reason: string; props: ComponentProps<typeof NestedPopupDialog> }> = [
		{
			reason: "the owner is collapsed",
			props: { expanded: false, popupAttributes: { "data-state": "open" } },
		},
		{
			reason: "the popup carries no open-state attribute",
			props: {},
		},
		{
			reason: "the popup is closed",
			props: { popupAttributes: { "data-state": "closed", "data-open": "false" } },
		},
		{
			reason: "aria-controls resolves to nothing",
			props: { controlsId: "does-not-exist", popupAttributes: { "data-state": "open" } },
		},
	];
	it.each(closingCases)("closes when $reason", async ({ props }) => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<NestedPopupDialog onOpenChange={onOpenChange} {...props} />);
		await screen.findByRole("dialog");
		screen.getByRole("button", { name: "Region" }).focus();

		await user.keyboard("{Escape}");

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("closes when focus is outside the expanded owner", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<NestedPopupDialog onOpenChange={onOpenChange} popupAttributes={{ "data-open": "true" }} />,
		);
		const content = await screen.findByRole("dialog");
		content.focus();

		await user.keyboard("{Escape}");

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	it("runs the guard before a consumer onEscapeKeyDown, which sees the prevented event", async () => {
		const user = userEvent.setup();
		const preventedWhenCalled: boolean[] = [];
		const onEscapeKeyDown = vi.fn<(event: KeyboardEvent) => void>((event) => {
			preventedWhenCalled.push(event.defaultPrevented);
		});
		render(
			<NestedPopupDialog
				onEscapeKeyDown={onEscapeKeyDown}
				popupAttributes={{ "data-state": "open" }}
			/>,
		);
		await screen.findByRole("dialog");
		screen.getByRole("button", { name: "Region" }).focus();

		await user.keyboard("{Escape}");

		expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
		expect(preventedWhenCalled).toEqual([true]);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("closes on the second Escape once the nested popup collapses", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		function Harness() {
			const [expanded, setExpanded] = useState(true);
			return (
				<Dialog.Root defaultOpen onOpenChange={onOpenChange}>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
						<button
							aria-controls="nested-popup"
							aria-expanded={expanded}
							onKeyDown={(event) => {
								if (event.key === "Escape") {
									setExpanded(false);
								}
							}}
							type="button"
						>
							Region
						</button>
						{expanded ? <div data-state="open" id="nested-popup" role="listbox" /> : null}
					</Dialog.Content>
				</Dialog.Root>
			);
		}
		render(<Harness />);
		await screen.findByRole("dialog");
		screen.getByRole("button", { name: "Region" }).focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("button", { name: "Region" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});
});

/**
 * Stands in for the Toast viewport, which marks itself `.overlay-prompt` and
 * `pointer-events-auto` so it stays interactive under a modal focus trap. The
 * inline style replaces the Tailwind class, since tests load no Tailwind. The
 * modal marks it `aria-hidden`, so queries for its button pass `hidden: true`.
 */
function PromptViewport() {
	return (
		<div className="overlay-prompt" style={{ pointerEvents: "auto" }}>
			<button type="button">Undo</button>
		</div>
	);
}

describe("outside interaction with a floating prompt", () => {
	// `preventCloseOnPromptInteraction` has its own unit tests. These pin that
	// `Dialog.Content` wires it into both Radix outside-interaction handlers.
	it("stays open on a click inside an .overlay-prompt", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<>
				<PromptViewport />
				<Dialog.Root defaultOpen onOpenChange={onOpenChange}>
					<Dialog.Content>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await screen.findByRole("dialog");

		await user.click(screen.getByRole("button", { name: "Undo", hidden: true }));

		expect(onOpenChange).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("still closes on a click on the overlay backdrop", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Dialog.Root defaultOpen onOpenChange={onOpenChange}>
				<Dialog.Content>
					<Dialog.Title>Request log</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		await screen.findByRole("dialog");
		const overlay = document.querySelector('[data-slot="dialog-overlay"]');
		if (!(overlay instanceof HTMLElement)) {
			throw new Error("dialog overlay not found");
		}

		await user.click(overlay);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	it("runs consumer outside-interaction handlers after the prompt guard", async () => {
		const user = userEvent.setup();
		const onInteractOutside = vi.fn<(event: Event) => void>();
		const onPointerDownOutside = vi.fn<(event: Event) => void>();
		render(
			<>
				<PromptViewport />
				<Dialog.Root defaultOpen>
					<Dialog.Content
						onInteractOutside={onInteractOutside}
						onPointerDownOutside={onPointerDownOutside}
					>
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		await screen.findByRole("dialog");

		await user.click(screen.getByRole("button", { name: "Undo", hidden: true }));

		// Both handlers run, and both see the event the guard already prevented.
		expect(onPointerDownOutside).toHaveBeenCalledTimes(1);
		expect(onPointerDownOutside.mock.lastCall?.[0].defaultPrevented).toBe(true);
		expect(onInteractOutside).toHaveBeenCalledTimes(1);
		expect(onInteractOutside.mock.lastCall?.[0].defaultPrevented).toBe(true);
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` rather than by a `test()`: a
 * `@ts-expect-error` that compiles is the assertion, and pairing it with a runtime
 * `expect` would read as coverage the vitest run does not have.
 *
 * `preferredWidth` caps a `"centered"` dialog. A `"full-page"` or `"full-bleed"` one
 * fills its box, so there is no width left to cap and the prop would silently do
 * nothing. A computed `appearance` still typechecks, which is what lets a consumer
 * toggle between appearances from state.
 */
export function typeLevelContracts({ fullBleed }: { fullBleed: boolean }) {
	return (
		<>
			{/* @ts-expect-error -- a full-bleed dialog has no width to cap */}
			<Dialog.Content appearance="full-bleed" preferredWidth="max-w-lg" />
			{/* @ts-expect-error -- neither does a full-page one */}
			<Dialog.Content appearance="full-page" preferredWidth="max-w-lg" />
			<Dialog.Content preferredWidth="max-w-2xl" />
			<Dialog.Content appearance={fullBleed ? "full-bleed" : "centered"} />
		</>
	);
}
