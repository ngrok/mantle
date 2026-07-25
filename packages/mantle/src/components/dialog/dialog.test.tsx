import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type ReactNode, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { Dialog } from "./dialog.js";
import { isDialogOverlayTarget } from "./primitive.js";

/**
 * Renders the documented `Dialog` composition in its open state so tests can
 * assert against the portalled content without driving the trigger first.
 */
const OpenDialog = ({
	children,
	onOpenChange,
}: {
	children?: ReactNode;
	onOpenChange?: (open: boolean) => void;
}) => (
	<Dialog.Root open onOpenChange={onOpenChange}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Rename tunnel</Dialog.Title>
			</Dialog.Header>
			<Dialog.Body>{children}</Dialog.Body>
		</Dialog.Content>
	</Dialog.Root>
);

const getDialogContent = () => screen.getByRole("dialog", { name: "Rename tunnel" });

describe("Dialog structure", () => {
	test("Dialog.Title provides the dialog's accessible name", () => {
		render(<OpenDialog />);
		expect(screen.getByRole("dialog", { name: "Rename tunnel" })).toBeInTheDocument();
	});

	test("the trigger opens the dialog and every part emits its documented data-slot", async () => {
		const user = userEvent.setup();
		render(
			<Dialog.Root>
				<Dialog.Trigger>Open</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Rename tunnel</Dialog.Title>
						<Dialog.Description>Pick a new name.</Dialog.Description>
						<Dialog.CloseIconButton />
					</Dialog.Header>
					<Dialog.Body>body</Dialog.Body>
					<Dialog.Footer>
						<Dialog.Close>Cancel</Dialog.Close>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>,
		);

		expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute(
			"data-slot",
			"dialog-trigger",
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Open" }));
		expect(screen.getByRole("dialog", { name: "Rename tunnel" })).toBeInTheDocument();

		const slots = [
			"dialog-overlay",
			"dialog-content",
			"dialog-header",
			"dialog-title",
			"dialog-description",
			"dialog-close-icon-button",
			"dialog-body",
			"dialog-footer",
			"dialog-close",
		];
		for (const slot of slots) {
			expect(document.querySelectorAll(`[data-slot="${slot}"]`)).toHaveLength(1);
		}
	});

	test("Dialog.Trigger asChild keeps the consumer's element, its data-slot, and its handler", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<Dialog.Root>
				<Dialog.Trigger asChild>
					<button className="my-button" onClick={onClick} type="button">
						Open
					</button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });
		expect(trigger.className).toContain("my-button");
		expect(trigger).toHaveAttribute("data-slot", "dialog-trigger");

		await user.click(trigger);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("dialog", { name: "Rename tunnel" })).toBeInTheDocument();
	});

	test("Dialog.Content carries data-mantle-modal-content so nested layers can detect modal context", () => {
		render(<OpenDialog />);
		expect(getDialogContent()).toHaveAttribute("data-mantle-modal-content");
	});

	test("Dialog.Content renders exactly one overlay", () => {
		render(<OpenDialog />);
		expect(document.querySelectorAll('[data-slot="dialog-overlay"]')).toHaveLength(1);
	});

	test("Dialog.Content forwards ref and arbitrary props to the dialog element", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Dialog.Root open>
				<Dialog.Content id="rename-dialog" data-flavor="primary" ref={ref}>
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const content = getDialogContent();
		expect(content).toHaveAttribute("id", "rename-dialog");
		expect(content).toHaveAttribute("data-flavor", "primary");
		expect(ref.current).toBe(content);
	});

	test("a consumer max-w className wins over the default preferredWidth", () => {
		render(
			<Dialog.Root open>
				<Dialog.Content className="max-w-3xl">
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const content = getDialogContent();
		expect(content.className).toContain("max-w-3xl");
		expect(content.className).not.toContain("max-w-lg");
	});

	test("preferredWidth replaces the default max-width and still loses to className", () => {
		render(
			<Dialog.Root open>
				<Dialog.Content className="max-w-3xl" preferredWidth="max-w-sm">
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		const content = getDialogContent();
		expect(content.className).toContain("max-w-3xl");
		expect(content.className).not.toContain("max-w-sm");
		expect(content.className).not.toContain("max-w-lg");
	});
});

describe("isDialogOverlayTarget", () => {
	test("returns true for the element Dialog.Overlay actually renders", () => {
		render(<OpenDialog />);
		const overlay = document.querySelector('[data-slot="dialog-overlay"]');
		expect(overlay).toBeInstanceOf(HTMLElement);
		expect(isDialogOverlayTarget(overlay)).toBe(true);
	});

	test("returns false for the dialog content and its centering wrapper", () => {
		render(<OpenDialog />);
		const content = getDialogContent();
		expect(isDialogOverlayTarget(content)).toBe(false);
		expect(isDialogOverlayTarget(content.parentElement)).toBe(false);
	});

	test("returns false for unrelated elements and non-element targets", () => {
		const plainDiv = document.createElement("div");
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		expect(isDialogOverlayTarget(plainDiv)).toBe(false);
		expect(isDialogOverlayTarget(svg)).toBe(false);
		expect(isDialogOverlayTarget(document)).toBe(false);
		expect(isDialogOverlayTarget(null)).toBe(false);
	});
});

describe("Dialog.Content aria-describedby", () => {
	test("is omitted when no Dialog.Description is rendered", () => {
		render(<OpenDialog />);
		expect(getDialogContent()).not.toHaveAttribute("aria-describedby");
	});

	test("resolves to the rendered Dialog.Description element", () => {
		render(
			<OpenDialog>
				<Dialog.Description>Pick a new name.</Dialog.Description>
			</OpenDialog>,
		);
		const describedBy = getDialogContent().getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		const description = document.querySelector('[data-slot="dialog-description"]');
		expect(description).toHaveAttribute("id", describedBy);
		expect(description).toHaveTextContent("Pick a new name.");
	});

	test("is removed again when the Dialog.Description unmounts", async () => {
		const user = userEvent.setup();
		const Harness = () => {
			const [showDescription, setShowDescription] = useState(true);
			return (
				<OpenDialog>
					<button onClick={() => setShowDescription(false)} type="button">
						Hide
					</button>
					{showDescription ? <Dialog.Description>Pick a new name.</Dialog.Description> : null}
				</OpenDialog>
			);
		};
		render(<Harness />);
		expect(getDialogContent()).toHaveAttribute("aria-describedby");

		await user.click(screen.getByRole("button", { name: "Hide" }));
		expect(getDialogContent()).not.toHaveAttribute("aria-describedby");
	});

	test("a consumer-supplied aria-describedby is not stripped", () => {
		render(
			<Dialog.Root open>
				<Dialog.Content aria-describedby="external-help">
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);
		expect(getDialogContent()).toHaveAttribute("aria-describedby", "external-help");
	});
});

describe("Dialog.Description asChild", () => {
	test("renders the consumer's element, merges className, and keeps the described-by id", () => {
		render(
			<OpenDialog>
				<Dialog.Description asChild className="text-xs">
					<p data-testid="description">Pick a new name.</p>
				</Dialog.Description>
			</OpenDialog>,
		);
		const description = screen.getByTestId("description");
		expect(description.tagName).toBe("P");
		expect(description).toHaveAttribute("data-slot", "dialog-description");
		expect(description.className).toContain("text-xs");
		expect(getDialogContent()).toHaveAttribute("aria-describedby", description.id);
	});
});

describe("Dialog.CloseIconButton", () => {
	test('is named "Close Dialog" by default and closes the dialog when clicked', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<OpenDialog onOpenChange={onOpenChange}>
				<Dialog.CloseIconButton />
			</OpenDialog>,
		);
		const closeButton = screen.getByRole("button", { name: "Close Dialog" });
		expect(closeButton).toHaveAttribute("type", "button");
		expect(closeButton).toHaveAttribute("data-slot", "dialog-close-icon-button");

		await user.click(closeButton);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("forwards a custom label and click handler", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<OpenDialog>
				<Dialog.CloseIconButton label="Dismiss" onClick={onClick} />
			</OpenDialog>,
		);
		expect(screen.queryByRole("button", { name: "Close Dialog" })).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Dismiss" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("Dialog Escape handling", () => {
	test("Escape closes the dialog", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<OpenDialog onOpenChange={onOpenChange} />);

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("a consumer onEscapeKeyDown runs with an unprevented event and does not block closing", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		// Radix prevents the event itself once it decides to dismiss, so the flag
		// has to be sampled while the handler is running, not from mock.lastCall.
		const preventedWhenCalled: boolean[] = [];
		const onEscapeKeyDown = vi.fn<(event: KeyboardEvent) => void>((event) => {
			preventedWhenCalled.push(event.defaultPrevented);
		});
		render(
			<Dialog.Root open onOpenChange={onOpenChange}>
				<Dialog.Content onEscapeKeyDown={onEscapeKeyDown}>
					<Dialog.Title>Rename tunnel</Dialog.Title>
				</Dialog.Content>
			</Dialog.Root>,
		);

		await user.keyboard("{Escape}");
		expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
		expect(onEscapeKeyDown.mock.lastCall?.[0].key).toBe("Escape");
		expect(preventedWhenCalled).toEqual([false]);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});
});

/**
 * Mirrors a nested popup owner (combobox / input-attached popover) inside a
 * dialog: an `aria-expanded` + `aria-controls` trigger paired with the popup it
 * controls. `popupAttributes` stands in for the open-state attribute each
 * library stamps — Ariakit `data-open`, Radix `data-state`.
 */
const NestedPopupDialog = ({
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
}) => (
	<Dialog.Root open onOpenChange={onOpenChange}>
		<Dialog.Content onEscapeKeyDown={onEscapeKeyDown}>
			<Dialog.Title>Rename tunnel</Dialog.Title>
			<button aria-controls={controlsId} aria-expanded={expanded} data-testid="owner" type="button">
				Region
			</button>
			<div id="nested-popup" role="listbox" {...popupAttributes} />
		</Dialog.Content>
	</Dialog.Root>
);

/** The open-state attribute each nested popup library stamps on its popup. */
const openPopupCases: { library: string; popupAttributes: Record<string, string> }[] = [
	{ library: "ariakit", popupAttributes: { "data-open": "true" } },
	{ library: "radix", popupAttributes: { "data-state": "open" } },
];

describe("Dialog Escape with a nested popup open", () => {
	test.for(openPopupCases)(
		"does not close while an expanded owner controls an open ($library) popup",
		async ({ popupAttributes }) => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn<(open: boolean) => void>();
			render(<NestedPopupDialog onOpenChange={onOpenChange} popupAttributes={popupAttributes} />);
			screen.getByTestId("owner").focus();

			await user.keyboard("{Escape}");
			expect(onOpenChange).not.toHaveBeenCalled();
			expect(screen.getByRole("dialog", { name: "Rename tunnel" })).toBeInTheDocument();
		},
	);

	test("a second Escape closes the dialog once the nested popup collapses", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const Harness = () => {
			const [expanded, setExpanded] = useState(true);
			return (
				<Dialog.Root open onOpenChange={onOpenChange}>
					<Dialog.Content>
						<Dialog.Title>Rename tunnel</Dialog.Title>
						<button
							aria-controls="nested-popup"
							aria-expanded={expanded}
							data-testid="owner"
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
		};
		render(<Harness />);
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByTestId("owner")).toHaveAttribute("aria-expanded", "false");

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("closes when the owner is collapsed", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<NestedPopupDialog
				expanded={false}
				onOpenChange={onOpenChange}
				popupAttributes={{ "data-state": "open" }}
			/>,
		);
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("closes when the controlled popup carries no open-state attribute", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		// cmdk-style always-visible lists have no open/close state and must never
		// swallow the Escape that closes the dialog.
		render(<NestedPopupDialog onOpenChange={onOpenChange} />);
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("closes when the popup is closed", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<NestedPopupDialog
				onOpenChange={onOpenChange}
				popupAttributes={{ "data-state": "closed", "data-open": "false" }}
			/>,
		);
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("closes when aria-controls resolves to nothing", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<NestedPopupDialog controlsId="does-not-exist" onOpenChange={onOpenChange} />);
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("the guard runs before a consumer onEscapeKeyDown, which sees the prevented event", async () => {
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
		screen.getByTestId("owner").focus();

		await user.keyboard("{Escape}");
		expect(onEscapeKeyDown).toHaveBeenCalledTimes(1);
		expect(preventedWhenCalled).toEqual([true]);
	});

	test("closes when focus is outside the expanded owner", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<NestedPopupDialog onOpenChange={onOpenChange} popupAttributes={{ "data-open": "true" }} />,
		);
		getDialogContent().focus();

		await user.keyboard("{Escape}");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});
});

/**
 * Mirrors the Toast viewport, which marks itself `.overlay-prompt` and
 * `pointer-events-auto` so it stays interactive while a modal focus trap is
 * active. The inline style stands in for the Tailwind class, since no Tailwind
 * is loaded in tests.
 */
const PromptViewport = () => (
	<div className="overlay-prompt" style={{ pointerEvents: "auto" }}>
		<button data-testid="toast-action" type="button">
			Undo
		</button>
	</div>
);

describe("Dialog interaction with floating prompts", () => {
	test("clicking inside an .overlay-prompt does not close the dialog", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<>
				<PromptViewport />
				<OpenDialog onOpenChange={onOpenChange} />
			</>,
		);

		await user.click(screen.getByTestId("toast-action"));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByRole("dialog", { name: "Rename tunnel" })).toBeInTheDocument();
	});

	test("clicking the overlay backdrop still closes the dialog", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(<OpenDialog onOpenChange={onOpenChange} />);
		const overlay = document.querySelector('[data-slot="dialog-overlay"]');
		expect(overlay).toBeInstanceOf(HTMLElement);
		if (!(overlay instanceof HTMLElement)) {
			return;
		}

		await user.click(overlay);
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("consumer outside-interaction handlers still run after the prompt guard", async () => {
		const user = userEvent.setup();
		const onInteractOutside = vi.fn<(event: Event) => void>();
		const onPointerDownOutside = vi.fn<(event: Event) => void>();
		render(
			<>
				<PromptViewport />
				<Dialog.Root open>
					<Dialog.Content
						onInteractOutside={onInteractOutside}
						onPointerDownOutside={onPointerDownOutside}
					>
						<Dialog.Title>Rename tunnel</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);

		await user.click(screen.getByTestId("toast-action"));
		// Both handlers run, and both see the event the mantle guard already prevented.
		expect(onPointerDownOutside).toHaveBeenCalledTimes(1);
		expect(onPointerDownOutside.mock.lastCall?.[0].defaultPrevented).toBe(true);
		expect(onInteractOutside).toHaveBeenCalledTimes(1);
		expect(onInteractOutside.mock.lastCall?.[0].defaultPrevented).toBe(true);
	});
});
