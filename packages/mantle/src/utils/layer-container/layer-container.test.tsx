import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { AlertDialog } from "../../components/alert-dialog/alert-dialog.js";
import { Combobox } from "../../components/combobox/combobox.js";
import { Command } from "../../components/command/command.js";
import { Dialog } from "../../components/dialog/dialog.js";
import { DropdownMenu } from "../../components/dropdown-menu/dropdown-menu.js";
import { HoverCard } from "../../components/hover-card/hover-card.js";
import { MultiSelect } from "../../components/multi-select/multi-select.js";
import { Popover } from "../../components/popover/popover.js";
import { Select } from "../../components/select/select.js";
import { Sheet } from "../../components/sheet/sheet.js";
import { makeToast, Toaster } from "../../components/toast/toast.js";
import { Tooltip, TooltipProvider } from "../../components/tooltip/tooltip.js";

/**
 * The layering contract these tests pin:
 *
 * - Overlays (`Dialog`, `AlertDialog`, `Sheet`) render at `z-60` and expose a
 *   positioner element that doubles as the layer container.
 * - Floats (`Popover`, `Tooltip`, `Select`, `DropdownMenu`, `HoverCard`) render
 *   at `z-50` and portal into the nearest layer container — the positioner when
 *   composed inside an overlay, else `document.body`.
 * - A float inside the positioner follows the overlay content in document
 *   order, so it paints above the content inside the overlay's stacking
 *   context. A float outside every overlay stays at `z-50`, below the overlay
 *   tier, no matter when it opens.
 *
 * `layer-container.browser.test.tsx` proves the paint order these placements
 * produce with real CSS; this file pins the DOM placement itself.
 */

/** Each overlay under test, its positioner slot, and its content slot. */
const overlays = [
	{
		name: "Dialog",
		positionerSlot: "dialog-positioner",
		contentSlot: "dialog-content",
		renderOpen: (children: React.ReactNode) => (
			<Dialog.Root open>
				<Dialog.Content>
					<Dialog.Title>Overlay</Dialog.Title>
					<Dialog.Body>{children}</Dialog.Body>
				</Dialog.Content>
			</Dialog.Root>
		),
	},
	{
		name: "AlertDialog",
		positionerSlot: "alert-dialog-positioner",
		contentSlot: "alert-dialog-content",
		renderOpen: (children: React.ReactNode) => (
			<AlertDialog.Root intent="info" open>
				<AlertDialog.Content>
					<AlertDialog.Body>
						<AlertDialog.Title>Overlay</AlertDialog.Title>
						{children}
					</AlertDialog.Body>
				</AlertDialog.Content>
			</AlertDialog.Root>
		),
	},
	{
		name: "Sheet",
		positionerSlot: "sheet-positioner",
		contentSlot: "sheet-content",
		renderOpen: (children: React.ReactNode) => (
			<Sheet.Root open>
				<Sheet.Content>
					<Sheet.Header>
						<Sheet.TitleGroup>
							<Sheet.Title>Overlay</Sheet.Title>
						</Sheet.TitleGroup>
					</Sheet.Header>
					<Sheet.Body>{children}</Sheet.Body>
				</Sheet.Content>
			</Sheet.Root>
		),
	},
] as const;

/**
 * Each float under test. `renderClosed` mounts it shut so a real event (or the
 * controlled-open flip for the hover-driven floats, whose pointer timing
 * happy-dom cannot reproduce) opens it after the overlay already exists —
 * the mount order that used to lose.
 */
const floats = [
	{
		name: "Popover",
		render: () => (
			<Popover.Root>
				<Popover.Trigger>Open float</Popover.Trigger>
				<Popover.Content>float content</Popover.Content>
			</Popover.Root>
		),
		open: async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("button", { name: "Open float" }));
		},
		findContent: () => screen.findByText("float content"),
		contentSlot: "popover-content",
	},
	{
		name: "DropdownMenu",
		render: () => (
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Open float</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>float content</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		),
		open: async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("button", { name: "Open float" }));
		},
		findContent: () => screen.findByRole("menu"),
		contentSlot: "dropdown-menu-content",
	},
	{
		name: "Select",
		render: () => (
			<Select.Root>
				<Select.Trigger aria-label="Open float" />
				<Select.Content>
					<Select.Item value="a">float content</Select.Item>
				</Select.Content>
			</Select.Root>
		),
		open: async (user: ReturnType<typeof userEvent.setup>) => {
			await user.click(screen.getByRole("combobox", { name: "Open float" }));
		},
		findContent: () => screen.findByRole("listbox"),
		contentSlot: "select-content",
	},
	{
		name: "Tooltip",
		render: () => (
			<TooltipProvider>
				<Tooltip.Root open>
					<Tooltip.Trigger>anchor</Tooltip.Trigger>
					<Tooltip.Content>float content</Tooltip.Content>
				</Tooltip.Root>
			</TooltipProvider>
		),
		open: async () => {},
		findContent: async () => {
			const contents = await screen.findAllByText("float content");
			const slotted = contents.find((element) => element.closest("[data-slot='tooltip-content']"));
			if (slotted == null) {
				throw new Error("no tooltip content with data-slot rendered");
			}
			return slotted;
		},
		contentSlot: "tooltip-content",
	},
	{
		name: "HoverCard",
		render: () => (
			<HoverCard.Root open>
				<HoverCard.Trigger>anchor</HoverCard.Trigger>
				<HoverCard.Content>float content</HoverCard.Content>
			</HoverCard.Root>
		),
		open: async () => {},
		findContent: () => screen.findByText("float content"),
		contentSlot: "hover-card-content",
	},
] as const;

function getPositioner(slot: string): HTMLElement {
	const positioner = document.querySelector<HTMLElement>(`[data-slot='${slot}']`);
	if (positioner == null) {
		throw new Error(`no [data-slot='${slot}'] rendered`);
	}
	return positioner;
}

describe("layer containers", () => {
	for (const overlay of overlays) {
		describe(`float inside ${overlay.name}`, () => {
			for (const float of floats) {
				test(`${float.name} portals into the ${overlay.name} positioner, after its content`, async () => {
					const user = userEvent.setup();
					render(overlay.renderOpen(float.render()));

					await float.open(user);
					const floatContent = await float.findContent();

					const positioner = getPositioner(overlay.positionerSlot);
					const overlayContent = getPositioner(overlay.contentSlot);
					expect(positioner.contains(floatContent)).toBe(true);
					// Document order decides paint order inside the positioner's
					// stacking context: the float must follow the overlay content.
					expect(
						overlayContent.compareDocumentPosition(floatContent) & Node.DOCUMENT_POSITION_FOLLOWING,
					).toBeTruthy();
					// The modal overlay marks the portal's other children
					// `aria-hidden` on open. The positioner is on the content's
					// ancestor chain, so a float portaled into it stays readable —
					// portaling into a sibling element instead would hide it.
					expect(floatContent.closest("[aria-hidden='true']")).toBeNull();
				});
			}
		});
	}

	describe("float outside every overlay", () => {
		test("a popover that opens after a dialog mounts stays out of the dialog's positioner", async () => {
			// The FEP-1754 shape: the overlay is already open when a base-level
			// popover opens later. Mount order used to put the popover on top.
			const user = userEvent.setup();
			render(
				<div>
					<Popover.Root>
						<Popover.Trigger>Open base popover</Popover.Trigger>
						<Popover.Content>base popover content</Popover.Content>
					</Popover.Root>
					<Dialog.Root open modal={false}>
						<Dialog.Content appearance="full-bleed">
							<Dialog.Title>Takeover</Dialog.Title>
						</Dialog.Content>
					</Dialog.Root>
				</div>,
			);

			await user.click(screen.getByRole("button", { name: "Open base popover" }));
			const popoverContent = await screen.findByText("base popover content");

			const positioner = getPositioner("dialog-positioner");
			expect(positioner.contains(popoverContent)).toBe(false);
			// It portals to document.body, where the overlay tier out-stacks it.
			expect(popoverContent.closest("[data-slot='dialog-positioner']")).toBeNull();
		});
	});

	describe("nested overlays", () => {
		test("a dialog opened from inside a dialog portals into the outer positioner", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Outer</Dialog.Title>
						<Dialog.Body>
							<Dialog.Root>
								<Dialog.Trigger>Open inner</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Title>Inner</Dialog.Title>
								</Dialog.Content>
							</Dialog.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open inner" }));
			await screen.findByText("Inner");

			const positioners = document.querySelectorAll("[data-slot='dialog-positioner']");
			expect(positioners).toHaveLength(2);
			const [outer, inner] = positioners;
			expect(outer != null && inner != null && outer.contains(inner)).toBe(true);
		});

		test("a sheet opened from inside a dialog portals into the dialog's positioner", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Outer</Dialog.Title>
						<Dialog.Body>
							<Sheet.Root>
								<Sheet.Trigger>Open sheet</Sheet.Trigger>
								<Sheet.Content>
									<Sheet.Header>
										<Sheet.TitleGroup>
											<Sheet.Title>Inner sheet</Sheet.Title>
										</Sheet.TitleGroup>
									</Sheet.Header>
								</Sheet.Content>
							</Sheet.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open sheet" }));
			await screen.findByText("Inner sheet");

			const dialogPositioner = getPositioner("dialog-positioner");
			const sheetPositioner = getPositioner("sheet-positioner");
			expect(dialogPositioner.contains(sheetPositioner)).toBe(true);
		});

		test("a popover inside the inner dialog portals into the inner positioner, not the outer one", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Outer</Dialog.Title>
						<Dialog.Body>
							<Dialog.Root open>
								<Dialog.Content>
									<Dialog.Title>Inner</Dialog.Title>
									<Dialog.Body>
										<Popover.Root>
											<Popover.Trigger>Open float</Popover.Trigger>
											<Popover.Content>float content</Popover.Content>
										</Popover.Root>
									</Dialog.Body>
								</Dialog.Content>
							</Dialog.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open float" }));
			const floatContent = await screen.findByText("float content");

			const positioners = document.querySelectorAll<HTMLElement>("[data-slot='dialog-positioner']");
			expect(positioners).toHaveLength(2);
			const inner = positioners[1];
			expect(inner != null && inner.contains(floatContent)).toBe(true);
		});

		test("an alert dialog opened from inside a dialog portals into the dialog's positioner", async () => {
			const user = userEvent.setup();
			render(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Outer</Dialog.Title>
						<Dialog.Body>
							<AlertDialog.Root intent="danger">
								<AlertDialog.Trigger>Open alert</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Body>
										<AlertDialog.Title>Inner alert</AlertDialog.Title>
									</AlertDialog.Body>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open alert" }));
			await screen.findByText("Inner alert");

			const dialogPositioner = getPositioner("dialog-positioner");
			const alertDialogPositioner = getPositioner("alert-dialog-positioner");
			expect(dialogPositioner.contains(alertDialogPositioner)).toBe(true);
		});

		test("DropdownMenu.SubContent portals into the same positioner as its menu", async () => {
			const user = userEvent.setup();
			render(
				overlays[0].renderOpen(
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>Open float</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent>
									<DropdownMenu.Item>sub item</DropdownMenu.Item>
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
						</DropdownMenu.Content>
					</DropdownMenu.Root>,
				),
			);

			await user.click(screen.getByRole("button", { name: "Open float" }));
			await user.hover(await screen.findByText("More"));
			const subItem = await screen.findByText("sub item");

			const positioner = getPositioner("dialog-positioner");
			expect(positioner.contains(subItem)).toBe(true);
		});
	});

	describe("explicit container escape hatches", () => {
		test("HoverCard.Portal's container prop wins over the layer container", async () => {
			const external = document.createElement("div");
			external.dataset.testid = "external";
			document.body.appendChild(external);

			render(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Overlay</Dialog.Title>
						<Dialog.Body>
							<HoverCard.Root open>
								<HoverCard.Trigger>anchor</HoverCard.Trigger>
								<HoverCard.Portal container={external}>
									<HoverCard.Content>float content</HoverCard.Content>
								</HoverCard.Portal>
							</HoverCard.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const floatContent = await screen.findByText("float content");
			expect(external.contains(floatContent)).toBe(true);

			external.remove();
		});

		test("Dialog.Portal's container prop wins over the layer container", async () => {
			const external = document.createElement("div");
			document.body.appendChild(external);

			render(
				<Dialog.Root open>
					<Dialog.Portal container={external}>
						<p>portaled content</p>
					</Dialog.Portal>
				</Dialog.Root>,
			);

			const content = await screen.findByText("portaled content");
			expect(external.contains(content)).toBe(true);

			external.remove();
		});
	});

	describe("floats inside a Popover", () => {
		// Floats do not register a layer container of their own, so a float
		// composed inside a popover shares the popover's container. It mounts
		// later, so within that shared container it paints above the popover.

		test("a Select inside a base popover shares the popover's container and follows it", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<Select.Root>
							<Select.Trigger aria-label="Open float" />
							<Select.Content>
								<Select.Item value="a">float content</Select.Item>
							</Select.Content>
						</Select.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByRole("combobox", { name: "Open float" }));
			const listbox = await screen.findByRole("listbox");

			const popoverContent = getPositioner("popover-content");
			expect(popoverContent.contains(listbox)).toBe(false);
			expect(listbox.closest("[data-slot='dialog-positioner']")).toBeNull();
			// Later body sibling at the same tier: the select paints above the
			// popover that spawned it.
			expect(
				popoverContent.compareDocumentPosition(listbox) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		test("a DropdownMenu inside a base popover shares the popover's container and follows it", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>Open float</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item>float content</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByRole("button", { name: "Open float" }));
			const menu = await screen.findByRole("menu");

			const popoverContent = getPositioner("popover-content");
			expect(popoverContent.contains(menu)).toBe(false);
			expect(
				popoverContent.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		test("a Tooltip inside a base popover shares the popover's container and follows it", async () => {
			const user = userEvent.setup();
			render(
				<TooltipProvider>
					<Popover.Root>
						<Popover.Trigger>Open host</Popover.Trigger>
						<Popover.Content>
							<Tooltip.Root open>
								<Tooltip.Trigger>anchor</Tooltip.Trigger>
								<Tooltip.Content>float content</Tooltip.Content>
							</Tooltip.Root>
						</Popover.Content>
					</Popover.Root>
				</TooltipProvider>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			const contents = await screen.findAllByText("float content");
			const tooltipContent = contents.find((element) =>
				element.closest("[data-slot='tooltip-content']"),
			);
			if (tooltipContent == null) {
				throw new Error("no tooltip content with data-slot rendered");
			}

			const popoverContent = getPositioner("popover-content");
			expect(popoverContent.contains(tooltipContent)).toBe(false);
			expect(
				popoverContent.compareDocumentPosition(tooltipContent) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		test("a Popover inside a popover shares the outer popover's container and follows it", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<Popover.Root>
							<Popover.Trigger>Open float</Popover.Trigger>
							<Popover.Content>float content</Popover.Content>
						</Popover.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByRole("button", { name: "Open float" }));
			const innerContent = await screen.findByText("float content");

			const contents = document.querySelectorAll("[data-slot='popover-content']");
			expect(contents).toHaveLength(2);
			const outer = contents[0];
			expect(outer != null && outer.contains(innerContent)).toBe(false);
			expect(
				outer != null &&
					(outer.compareDocumentPosition(innerContent) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
			).toBe(true);
		});

		test("a Combobox inside a base popover renders its popup in place, inside the popover content", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<Combobox.Root>
							<Combobox.Input aria-label="Fruit" />
							<Combobox.Content>
								<Combobox.Item value="Apple" />
							</Combobox.Content>
						</Combobox.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByRole("combobox", { name: "Fruit" }));
			await user.keyboard("App");
			const popup = await screen.findByRole("listbox");

			expect(getPositioner("popover-content").contains(popup)).toBe(true);
		});

		test("a Select inside a popover inside a dialog portals into the dialog's positioner", async () => {
			const user = userEvent.setup();
			render(
				overlays[0].renderOpen(
					<Popover.Root>
						<Popover.Trigger>Open host</Popover.Trigger>
						<Popover.Content>
							<Select.Root>
								<Select.Trigger aria-label="Open float" />
								<Select.Content>
									<Select.Item value="a">float content</Select.Item>
								</Select.Content>
							</Select.Root>
						</Popover.Content>
					</Popover.Root>,
				),
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByRole("combobox", { name: "Open float" }));
			const listbox = await screen.findByRole("listbox");

			const positioner = getPositioner("dialog-positioner");
			const popoverContent = getPositioner("popover-content");
			expect(positioner.contains(listbox)).toBe(true);
			expect(
				popoverContent.compareDocumentPosition(listbox) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		test("a HoverCard inside a base popover shares the popover's container and follows it", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<HoverCard.Root open>
							<HoverCard.Trigger>anchor</HoverCard.Trigger>
							<HoverCard.Content>float content</HoverCard.Content>
						</HoverCard.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			const hoverCardContent = await screen.findByText("float content");

			const popoverContent = getPositioner("popover-content");
			expect(popoverContent.contains(hoverCardContent)).toBe(false);
			expect(
				popoverContent.compareDocumentPosition(hoverCardContent) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		test("a MultiSelect inside a base popover portals to document.body", async () => {
			const user = userEvent.setup();
			render(
				<Popover.Root>
					<Popover.Trigger>Open host</Popover.Trigger>
					<Popover.Content>
						<MultiSelect.Root>
							<MultiSelect.Trigger>
								<MultiSelect.TagValues />
								<MultiSelect.Input placeholder="Select items..." />
							</MultiSelect.Trigger>
							<MultiSelect.Content>
								<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
							</MultiSelect.Content>
						</MultiSelect.Root>
					</Popover.Content>
				</Popover.Root>,
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByPlaceholderText("Select items..."));
			const popup = await screen.findByRole("listbox");

			expect(getPositioner("popover-content").contains(popup)).toBe(false);
			expect(popup.closest("[data-slot='dialog-positioner']")).toBeNull();
		});

		test("a MultiSelect inside a popover inside a dialog portals into the dialog's positioner", async () => {
			// The trigger sits in a float portaled into the positioner, so
			// `closest("[data-mantle-modal-content]")` cannot reach the dialog
			// content — without the layer-container fallback the popup lands on
			// `document.body` at `z-50`, under the `z-60` dialog.
			const user = userEvent.setup();
			render(
				overlays[0].renderOpen(
					<Popover.Root>
						<Popover.Trigger>Open host</Popover.Trigger>
						<Popover.Content>
							<MultiSelect.Root>
								<MultiSelect.Trigger>
									<MultiSelect.TagValues />
									<MultiSelect.Input placeholder="Select items..." />
								</MultiSelect.Trigger>
								<MultiSelect.Content>
									<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
								</MultiSelect.Content>
							</MultiSelect.Root>
						</Popover.Content>
					</Popover.Root>,
				),
			);

			await user.click(screen.getByRole("button", { name: "Open host" }));
			await user.click(await screen.findByPlaceholderText("Select items..."));
			const popup = await screen.findByRole("listbox");

			expect(getPositioner("dialog-positioner").contains(popup)).toBe(true);
		});
	});

	describe("layers with their own placement rules", () => {
		test("Combobox renders its popup in place, inside the dialog content element", async () => {
			// The dialog primitive's Escape guard requires the popup to be a DOM
			// descendant of the dialog content (`currentTarget.contains(popup)`),
			// so `Combobox.Content` must never portal. Adding Ariakit's `portal`
			// prop to it turns this red — and breaks Escape inside dialogs.
			const user = userEvent.setup();
			render(
				overlays[0].renderOpen(
					<Combobox.Root>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
						</Combobox.Content>
					</Combobox.Root>,
				),
			);

			await user.click(screen.getByRole("combobox", { name: "Fruit" }));
			await user.keyboard("App");
			const popup = await screen.findByRole("listbox");

			const dialogContent = getPositioner("dialog-content");
			expect(dialogContent.contains(popup)).toBe(true);
		});

		test("MultiSelect portals its popup into the dialog's `data-mantle-modal-content` element", async () => {
			// Both sides of the cross-file contract in one render: the dialog
			// stamps `data-mantle-modal-content` on its content, and
			// `MultiSelect.Content` resolves its Ariakit `portalElement` to the
			// closest one so the Escape guard still contains the popup.
			const user = userEvent.setup();
			render(
				overlays[0].renderOpen(
					<MultiSelect.Root>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>,
				),
			);

			await user.click(screen.getByPlaceholderText("Select items..."));
			const popup = await screen.findByRole("listbox");

			const dialogContent = getPositioner("dialog-content");
			expect(dialogContent.hasAttribute("data-mantle-modal-content")).toBe(true);
			expect(dialogContent.contains(popup)).toBe(true);
		});

		test("Combobox renders its popup in place inside the alert dialog content element", async () => {
			const user = userEvent.setup();
			render(
				overlays[1].renderOpen(
					<Combobox.Root>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
						</Combobox.Content>
					</Combobox.Root>,
				),
			);

			await user.click(screen.getByRole("combobox", { name: "Fruit" }));
			await user.keyboard("App");
			const popup = await screen.findByRole("listbox");

			expect(getPositioner("alert-dialog-content").contains(popup)).toBe(true);
		});

		test("MultiSelect portals its popup into the alert dialog's `data-mantle-modal-content` element", async () => {
			const user = userEvent.setup();
			render(
				overlays[1].renderOpen(
					<MultiSelect.Root>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>,
				),
			);

			await user.click(screen.getByPlaceholderText("Select items..."));
			const popup = await screen.findByRole("listbox");

			const alertDialogContent = getPositioner("alert-dialog-content");
			expect(alertDialogContent.hasAttribute("data-mantle-modal-content")).toBe(true);
			expect(alertDialogContent.contains(popup)).toBe(true);
		});

		test("Combobox renders its popup in place inside the sheet content element", async () => {
			const user = userEvent.setup();
			render(
				overlays[2].renderOpen(
					<Combobox.Root>
						<Combobox.Input aria-label="Fruit" />
						<Combobox.Content>
							<Combobox.Item value="Apple" />
						</Combobox.Content>
					</Combobox.Root>,
				),
			);

			await user.click(screen.getByRole("combobox", { name: "Fruit" }));
			await user.keyboard("App");
			const popup = await screen.findByRole("listbox");

			expect(getPositioner("sheet-content").contains(popup)).toBe(true);
		});

		test("MultiSelect portals its popup into the sheet's `data-mantle-modal-content` element", async () => {
			const user = userEvent.setup();
			render(
				overlays[2].renderOpen(
					<MultiSelect.Root>
						<MultiSelect.Trigger>
							<MultiSelect.TagValues />
							<MultiSelect.Input placeholder="Select items..." />
						</MultiSelect.Trigger>
						<MultiSelect.Content>
							<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
						</MultiSelect.Content>
					</MultiSelect.Root>,
				),
			);

			await user.click(screen.getByPlaceholderText("Select items..."));
			const popup = await screen.findByRole("listbox");

			const sheetContent = getPositioner("sheet-content");
			expect(sheetContent.hasAttribute("data-mantle-modal-content")).toBe(true);
			expect(sheetContent.contains(popup)).toBe(true);
		});

		test("a toast fired while a dialog is open renders in sonner's viewport, not the positioner", async () => {
			render(
				<div>
					<Toaster />
					{overlays[0].renderOpen(<p>body</p>)}
				</div>,
			);

			makeToast(<p>toast content</p>);
			const toastContent = await screen.findByText("toast content");

			const viewport = document.querySelector("[data-sonner-toaster]");
			expect(viewport != null && viewport.contains(toastContent)).toBe(true);
			expect(getPositioner("dialog-positioner").contains(toastContent)).toBe(false);
		});

		test("Command.DialogRoot renders its palette inside a dialog positioner", async () => {
			render(
				<Command.DialogRoot open>
					<Command.DialogContent title="Command palette">
						<Command.Input placeholder="Search…" />
						<Command.List>
							<Command.Item>palette item</Command.Item>
						</Command.List>
					</Command.DialogContent>
				</Command.DialogRoot>,
			);

			const item = await screen.findByText("palette item");
			expect(getPositioner("dialog-positioner").contains(item)).toBe(true);
		});
	});

	describe("server render", () => {
		test("an open dialog with a default-open popover renders on the server without portals", () => {
			// Portals cannot render during SSR; the trigger markup still must.
			const html = renderToString(
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Overlay</Dialog.Title>
						<Dialog.Body>
							<Popover.Root defaultOpen>
								<Popover.Trigger>Open float</Popover.Trigger>
								<Popover.Content>float content</Popover.Content>
							</Popover.Root>
						</Dialog.Body>
					</Dialog.Content>
				</Dialog.Root>,
			);

			expect(html).not.toContain("float content");
			expect(html).not.toContain('data-slot="dialog-positioner"');
		});
	});
});

describe("layer tiers", () => {
	// Why class assertions: the z-index tier is the only observable
	// implementation of the layering contract in happy-dom — no stylesheet
	// loads, so there is no computed style to read. Each class below is pinned
	// against the selector-free contract the JSDoc documents (floats `z-50`,
	// overlays `z-60`); `layer-container.browser.test.tsx` asserts the paint
	// order these classes produce. A permuted tier (overlay at `z-50`, float at
	// `z-60`) turns exactly this test red.
	test("overlay elements carry the overlay tier and floats carry the float tier", async () => {
		const user = userEvent.setup();
		render(
			<div>
				{overlays[0].renderOpen(
					<Popover.Root>
						<Popover.Trigger>Open float</Popover.Trigger>
						<Popover.Content>float content</Popover.Content>
					</Popover.Root>,
				)}
			</div>,
		);

		await user.click(screen.getByRole("button", { name: "Open float" }));
		const floatContent = await screen.findByText("float content");

		expect(getPositioner("dialog-positioner")).toHaveClass("z-60");
		expect(getPositioner("dialog-overlay")).toHaveClass("z-60");
		expect(floatContent.closest("[data-slot='popover-content']")).toHaveClass("z-50");
	});

	test("sheet positioner and overlay carry the overlay tier", async () => {
		render(overlays[2].renderOpen(<p>body</p>));

		await waitFor(() => {
			expect(getPositioner("sheet-positioner")).toHaveClass("z-60");
		});
		expect(getPositioner("sheet-overlay")).toHaveClass("z-60");
		// The tier lives on the positioner; the content must not carry a stale
		// tier of its own.
		expect(getPositioner("sheet-content")).not.toHaveClass("z-50");
	});
});
