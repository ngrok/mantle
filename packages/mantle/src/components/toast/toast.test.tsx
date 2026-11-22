import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { preventCloseOnPromptInteraction } from "./prevent-close-on-prompt-interaction.js";
import * as Toast from "./toast-parts.js";
import { makeToast, resolveToastDuration, Toaster } from "./toast.js";

function getToastRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="toast"]');
}

describe("Toast", () => {
	describe("intent", () => {
		// Why the class: the bar carries no data attribute, so its class is the only observable of the `intentBackgroundColor` lookup.
		test.each([
			["danger", "bg-danger-600"],
			["info", "bg-accent-600"],
			["success", "bg-success-600"],
			["warning", "bg-warning-600"],
		] as const)(`renders intent="%s" with the %s bar accent`, (intent, barClass) => {
			const { container } = render(
				<Toast.Root intent={intent}>
					<Toast.Message>message</Toast.Message>
				</Toast.Root>,
			);
			const bar = container.querySelector('[aria-hidden="true"]');
			expect(bar).not.toBeNull();
			expect(bar).toHaveClass(barClass);
		});
	});

	describe("Icon", () => {
		// Why the class: the icon carries no intent attribute, so its tone class is the only observable of the intent `switch`.
		test.each([
			["danger", "text-danger-600"],
			["warning", "text-warning-600"],
			["success", "text-success-600"],
			["info", "text-accent-600"],
		] as const)(`renders the default icon for intent="%s" with %s`, (intent, toneClass) => {
			const { container } = render(
				<Toast.Root intent={intent}>
					<Toast.Icon />
					<Toast.Message>message</Toast.Message>
				</Toast.Root>,
			);
			const icon = container.querySelector('[data-slot~="toast-icon"]');
			expect(icon).not.toBeNull();
			expect(icon).toHaveClass(toneClass);
		});

		// Regression: the info branch rendered its default icon and ignored `svg`.
		test.each(["danger", "warning", "success", "info"] as const)(
			`renders a custom svg for intent="%s"`,
			(intent) => {
				render(
					<Toast.Root intent={intent}>
						<Toast.Icon svg={<svg data-testid="custom-icon" />} />
						<Toast.Message>message</Toast.Message>
					</Toast.Root>,
				);
				// The part's slot joins ahead of the `Icon` and `SvgOnly` slots it composes.
				expect(screen.getByTestId("custom-icon")).toHaveAttribute(
					"data-slot",
					"toast-icon icon svg-only",
				);
			},
		);
	});

	describe("makeToast", () => {
		/**
		 * A copy of `toast.js` whose sonner chunk has not loaded. sonner itself
		 * loads once per worker, so each message is unique to its test.
		 */
		// Why: sonner keeps each active toast, and a later `Toaster` would show it again.
		afterEach(() => {
			sonnerToast.dismiss();
			vi.doUnmock("sonner");
		});

		async function importUnloadedToast() {
			vi.resetModules();
			return import("./toast.js");
		}

		function toastTexts() {
			return Array.from(
				document.querySelectorAll('[data-slot="toast"]'),
				(toast) => toast.textContent,
			);
		}

		test("shows the toasts made before the chunk loads and while it loads, in call order", async () => {
			const unloaded = await importUnloadedToast();
			const toast = (message: string) => (
				<unloaded.Root intent="info">
					<unloaded.Message>{message}</unloaded.Message>
				</unloaded.Root>
			);

			// The first call starts the load, so the second waits for the chunk.
			unloaded.makeToast(toast("Queued first"));
			unloaded.makeToast(toast("Queued second"));
			render(<unloaded.Toaster />);
			unloaded.makeToast(toast("Queued third"));

			// sonner stacks the newest toast first.
			await waitFor(() => {
				expect(toastTexts().filter((text) => text?.startsWith("Queued"))).toEqual([
					"Queued third",
					"Queued second",
					"Queued first",
				]);
			});
		});

		test("updates a waiting toast in place when a later call reuses its id", async () => {
			const unloaded = await importUnloadedToast();

			expect(unloaded.makeToast(<p>Uploading</p>, { id: "upload" })).toBe("upload");
			unloaded.makeToast(<p>Uploaded</p>, { id: "upload" });
			render(<unloaded.Toaster />);

			expect(await screen.findByText("Uploaded")).toBeInTheDocument();
			expect(screen.queryByText("Uploading")).toBeNull();
		});

		test("keeps the page, the landmark, and the waiting toasts when the chunk fails to load", async () => {
			const chunkError = new Error("Failed to fetch dynamically imported module");
			vi.doMock("sonner", () => {
				throw chunkError;
			});
			// Why the stub: happy-dom has no `reportError`, and the report is the only trace of the failure.
			const reportError = vi.fn<(error: unknown) => void>();
			vi.stubGlobal("reportError", reportError);
			const unloaded = await importUnloadedToast();

			unloaded.makeToast(<p>Saved before the outage</p>);
			await vi.dynamicImportSettled();
			expect(reportError).toHaveBeenCalledTimes(1);
			// Why `cause`: vitest wraps the error that a mock factory throws.
			expect(reportError).toHaveBeenLastCalledWith(expect.objectContaining({ cause: chunkError }));
			render(<unloaded.Toaster />);
			expect(screen.getByRole("region", { name: "Notifications alt+T" })).toBeInTheDocument();

			vi.doUnmock("sonner");
			unloaded.makeToast(<p>Saved after the outage</p>);

			expect(await screen.findByText("Saved after the outage")).toBeInTheDocument();
			expect(screen.getByText("Saved before the outage")).toBeInTheDocument();
		});

		test("renders the notifications landmark while the chunk loads", async () => {
			vi.doMock("sonner", () => new Promise(() => {}));
			const unloaded = await importUnloadedToast();
			render(<unloaded.Toaster />);

			// Why the hotkey in the name: sonner's section uses the same label, Alt+T included.
			expect(screen.getByRole("region", { name: "Notifications alt+T" })).toBeInTheDocument();
		});

		test("loads the chunk when the browser is idle, before the first toast", async () => {
			const unloaded = await importUnloadedToast();
			render(<unloaded.Toaster />);
			await waitFor(() => {
				expect(document.querySelector("section[data-react-aria-top-layer]")).not.toBeNull();
			});
			// Why the spy: once the chunk is in, a toast reaches sonner in the same call.
			const custom = vi.spyOn(sonnerToast, "custom");

			unloaded.makeToast(<p>Copied</p>);

			expect(custom).toHaveBeenCalledTimes(1);
		});

		test("gives every generated id a value no other toast holds, across module copies", async () => {
			const first = await importUnloadedToast();
			const second = await importUnloadedToast();
			render(<first.Toaster />);

			const firstId = first.makeToast(<p>From copy one</p>);
			second.makeToast(<p>From copy two</p>);
			first.makeToast(<p>With a look-alike custom id</p>, { id: String(firstId) });

			expect(await screen.findByText("With a look-alike custom id")).toBeInTheDocument();
			expect(screen.getByText("From copy one")).toBeInTheDocument();
			expect(screen.getByText("From copy two")).toBeInTheDocument();
		});
	});

	describe("resolveToastDuration", () => {
		test.each([
			[0, Number.POSITIVE_INFINITY],
			[-1, Number.POSITIVE_INFINITY],
			[5000, 5000],
			[undefined, undefined],
		])("resolves %s to %s", (input, expected) => {
			expect(resolveToastDuration(input)).toBe(expected);
		});
	});
});

describe("Toast.Root label slot", () => {
	function Harness({ children }: { children: ReactNode }) {
		return <Toast.Root intent="info">{children}</Toast.Root>;
	}

	test("wraps children in a contents label div directly under the root", () => {
		const { container } = render(
			<Toast.Root intent="info">
				<Toast.Message>Saved</Toast.Message>
			</Toast.Root>,
		);

		const root = getToastRoot(container);
		const label = root?.querySelector('[data-slot="toast-label"]');
		expect(label).toHaveTextContent("Saved");
		expect(label?.parentElement).toBe(root);
		// A `<span>` may not contain the `<p>` that `Toast.Message` renders.
		expect(label?.tagName).toBe("DIV");
	});

	test("keeps rendering when a translated text child swaps to an element", () => {
		const { container, rerender } = render(<Harness>Saving…</Harness>);
		const root = getToastRoot(container);
		if (root == null) {
			throw new Error("expected a mounted toast root");
		}
		translateTextNodes(root);
		expect(root).toHaveTextContent("[Saving…-es]");

		rerender(
			<Harness>
				<Toast.Message>Saved</Toast.Message>
			</Harness>,
		);

		expect(findTranslatedFont(root)).toBeNull();
		expect(root).toHaveTextContent("Saved");
	});

	test("keeps rendering when a translated text child unmounts", () => {
		const { container, rerender } = render(<Harness>Saving…</Harness>);
		const root = getToastRoot(container);
		if (root == null) {
			throw new Error("expected a mounted toast root");
		}
		translateTextNodes(root);
		expect(root).toHaveTextContent("[Saving…-es]");

		rerender(<Harness>{null}</Harness>);

		expect(root).toHaveTextContent("");
	});
});

describe("Toast.Action", () => {
	function renderToast(message: string, action: ReactNode) {
		render(<Toaster />);
		makeToast(
			<Toast.Root intent="info">
				<Toast.Message>{message}</Toast.Message>
				{action}
			</Toast.Root>,
		);
	}

	test("dismisses the toast on click", async () => {
		const user = userEvent.setup();
		renderToast("Saved", <Toast.Action>Dismiss</Toast.Action>);

		await user.click(await screen.findByRole("button", { name: "Dismiss" }));

		// Why `waitFor`: sonner unmounts a dismissed toast on a timer.
		await waitFor(() => {
			expect(screen.queryByText("Saved")).toBeNull();
		});
	});

	test("runs a consumer `onClick` and still dismisses the toast", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
		renderToast("Changes saved", <Toast.Action onClick={handleClick}>Undo</Toast.Action>);

		await user.click(await screen.findByRole("button", { name: "Undo" }));

		expect(handleClick).toHaveBeenCalledTimes(1);
		// Why `waitFor`: sonner unmounts a dismissed toast on a timer.
		await waitFor(() => {
			expect(screen.queryByText("Changes saved")).toBeNull();
		});
	});

	test("keeps the toast when `onClick` calls `preventDefault`", async () => {
		const user = userEvent.setup();
		// Why the spy: a dismissed toast stays in the DOM until sonner's unmount
		// timer fires, so the skipped `dismiss` call is the only synchronous trace.
		const dismiss = vi.spyOn(sonnerToast, "dismiss");
		const handleClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
			event.preventDefault();
		});
		renderToast("Draft kept", <Toast.Action onClick={handleClick}>Keep</Toast.Action>);

		await user.click(await screen.findByRole("button", { name: "Keep" }));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(dismiss).toHaveBeenCalledTimes(0);
	});
});

describe("Toaster", () => {
	test("marks its list as an overlay prompt, so a toast interaction cannot close a modal", async () => {
		render(<Toaster />);
		// sonner renders the list only once a toast exists, so create a real one
		act(() => {
			makeToast(
				<Toast.Root intent="info">
					<Toast.Message>File uploaded</Toast.Message>
					<Toast.Action>View file</Toast.Action>
				</Toast.Root>,
			);
		});
		const action = await screen.findByRole("button", { name: "View file" });

		const list = document.querySelector("[data-sonner-toaster]");
		expect(list).not.toBeNull();
		expect(list).toContainElement(action);

		// Why both halves: every mantle modal routes its outside-interaction
		// events through this guard, and only the class `Toaster` stamps makes it
		// match. Asserting one side leaves the pair one rename from a dialog that
		// closes under a toast action.
		const pointerDown = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
		action.dispatchEvent(pointerDown);
		preventCloseOnPromptInteraction(pointerDown);
		expect(pointerDown.defaultPrevented).toBe(true);
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` and not by a `test()`. A
 * `@ts-expect-error` that compiles is the assertion; a runtime `expect` beside
 * it reads as coverage the vitest run does not have.
 */
export function typeLevelContracts() {
	return (
		// @ts-expect-error -- intent is required on Toast.Root
		<Toast.Root>
			<Toast.Message>message</Toast.Message>
		</Toast.Root>
	);
}
