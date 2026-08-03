import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog } from "./dialog.js";

afterEach(() => {
	cleanup();
});

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
			// tailwind-merge override contract: the consumer's cap has to replace the
			// max-w-lg default, not land beside it where source order would decide.
			expect(content.className).toContain("max-w-2xl");
			expect(content.className).not.toContain("max-w-lg");
		});

		it.each(["full-page", "full-bleed"] as const)(
			"uncaps the width for %s, which accepts no preferredWidth",
			async (appearance) => {
				const { content } = await open(appearance);

				expect(content.className).toContain("max-w-none");
				expect(content.className).not.toContain("max-w-lg");
			},
		);

		it.each([
			{ appearance: "centered", rounded: true },
			{ appearance: "full-page", rounded: true },
			{ appearance: "full-bleed", rounded: false },
		] as const)(
			"paints $appearance with rounded=$rounded corners and a matching border",
			async ({ appearance, rounded }) => {
				const { content } = await open(appearance);

				// The radius and border are the only observable difference between
				// full-page and full-bleed: neither emits a data attribute, and happy-dom
				// computes no styles for them.
				expect(content.className.includes("rounded-xl")).toBe(rounded);
				expect(content.className.includes("border-dialog")).toBe(rounded);
			},
		);

		it("keeps the overlay at full bleed so the zoom-in animation has a backdrop", async () => {
			await open("full-bleed");

			expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
		});

		it("lets a consumer className beat the appearance defaults", async () => {
			render(
				<Dialog.Root defaultOpen>
					<Dialog.Content appearance="full-bleed" className="rounded-lg">
						<Dialog.Title>Request log</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>,
			);

			const content = await screen.findByRole("dialog");
			// tailwind-merge override contract: consumer className merges last.
			expect(content.className).toContain("rounded-lg");
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
