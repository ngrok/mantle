import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent, ReactNode } from "react";
import * as ToastPrimitive from "sonner";
import { describe, expect, test, vi } from "vitest";
import { preventCloseOnPromptInteraction } from "./prevent-close-on-prompt-interaction.js";
import type { ToastIntent } from "./toast.js";
import { makeToast, Toast, Toaster } from "./toast.js";

function getToastRoot(container: HTMLElement) {
	return container.querySelector('[data-slot="toast"]');
}

/**
 * Type-level contract, owned by `pnpm typecheck` rather than vitest: making
 * `intent` optional on `Toast.Root` turns the directive below into an unused
 * `@ts-expect-error`, which is a compile error. It is deliberately not a
 * `test()` — no runtime assertion can observe a type, and a constant-true
 * `expect` would only claim otherwise.
 */
void (
	(
		// @ts-expect-error -- intent is required on Toast.Root
		<Toast.Root>
			<Toast.Message>message</Toast.Message>
		</Toast.Root>
	)
);

/**
 * Creates a toast without handing it to the real sonner store, and renders the
 * element sonner would have rendered — which is the only way to get the toast id
 * context (`Toast.Action`'s dismiss target) that `makeToast` provides.
 */
function renderMadeToast(children: ReactNode, toastId: string) {
	const custom = vi.spyOn(ToastPrimitive.toast, "custom").mockReturnValue(toastId);
	makeToast(children);
	const renderToast = custom.mock.lastCall?.[0];
	if (renderToast == null) {
		throw new Error("makeToast did not hand a render function to sonner");
	}
	return render(renderToast(toastId));
}

describe("Toast", () => {
	test("renders the message", () => {
		// `ToastIntent` is the public name for the toast tone union; annotating
		// the prop value here keeps the exported type exercised by tsc.
		const intent: ToastIntent = "success";
		render(
			<Toast.Root intent={intent}>
				<Toast.Message>Changes saved</Toast.Message>
			</Toast.Root>,
		);
		expect(screen.getByText("Changes saved")).toBeInTheDocument();
	});

	describe("intent", () => {
		// Class pins, deliberately: the intent accent bar is a decorative
		// `aria-hidden` strip with no `data-slot` and no data attribute of its own,
		// so its background class is the entire observable implementation of
		// `intent` — nothing else in the DOM differs between tones.
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
		test.each(["danger", "warning", "success", "info"] as const)(
			`renders a default glyph for every intent, including "%s"`,
			(intent) => {
				// an intent missing from the default-icon map throws
				// "Unreachable Case" instead of rendering, so presence per intent is
				// the real assertion here
				const { container } = render(
					<Toast.Root intent={intent}>
						<Toast.Icon />
						<Toast.Message>message</Toast.Message>
					</Toast.Root>,
				);
				const icon = container.querySelector('[data-slot="toast-icon"]');
				expect(icon).toBeInTheDocument();
				// the slot is stamped onto the svg element itself
				expect(icon?.tagName.toLowerCase()).toBe("svg");
			},
		);

		test.each(["danger", "warning", "success", "info"] as const)(
			`renders a custom svg in place of the default icon for intent="%s"`,
			(intent) => {
				// regression: the `info` branch rendered its default glyph
				// unconditionally, so a consumer-supplied icon was dropped — and
				// `svg` is destructured, so it never reached the DOM via the rest
				// spread either.
				const { container } = render(
					<Toast.Root intent={intent}>
						<Toast.Icon svg={<svg data-testid="custom-icon" />} />
						<Toast.Message>message</Toast.Message>
					</Toast.Root>,
				);
				expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument();
			},
		);
	});

	describe("Action", () => {
		test("dismisses the toast it was created for when clicked", async () => {
			const user = userEvent.setup();
			const dismiss = vi.spyOn(ToastPrimitive.toast, "dismiss");
			renderMadeToast(
				<Toast.Root intent="info">
					<Toast.Message>File uploaded</Toast.Message>
					<Toast.Action>View file</Toast.Action>
				</Toast.Root>,
				"upload-toast",
			);

			await user.click(screen.getByRole("button", { name: "View file" }));

			expect(dismiss).toHaveBeenCalledTimes(1);
			// the id comes from the render callback sonner invokes, not from the
			// caller — dismissing the wrong id would leave the toast on screen
			expect(dismiss).toHaveBeenLastCalledWith("upload-toast");
		});

		test("runs a consumer onClick and still dismisses", async () => {
			const user = userEvent.setup();
			const dismiss = vi.spyOn(ToastPrimitive.toast, "dismiss");
			const onClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>();
			renderMadeToast(
				<Toast.Root intent="success">
					<Toast.Message>Changes saved</Toast.Message>
					<Toast.Action onClick={onClick}>Undo</Toast.Action>
				</Toast.Root>,
				"save-toast",
			);

			await user.click(screen.getByRole("button", { name: "Undo" }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(dismiss).toHaveBeenCalledTimes(1);
			expect(dismiss).toHaveBeenLastCalledWith("save-toast");
		});

		test("keeps the toast open when onClick calls preventDefault", async () => {
			const user = userEvent.setup();
			const dismiss = vi.spyOn(ToastPrimitive.toast, "dismiss");
			// the documented opt-out: a retry action keeps its own toast on screen
			const onClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
				event.preventDefault();
			});
			renderMadeToast(
				<Toast.Root intent="danger">
					<Toast.Message>Upload failed</Toast.Message>
					<Toast.Action onClick={onClick}>Retry</Toast.Action>
				</Toast.Root>,
				"retry-toast",
			);

			await user.click(screen.getByRole("button", { name: "Retry" }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(dismiss).not.toHaveBeenCalled();
		});
	});

	test("renders the toast container with the intent bar overlapping the border", () => {
		const { container } = render(
			<Toast.Root intent="info">
				<Toast.Message>message</Toast.Message>
			</Toast.Root>,
		);
		// Class pin for a two-class contract that spans two elements: the bar's
		// `-inset-px` overhang only reaches over the border while the root does NOT
		// clip it (see the warning comment in Toast.Root's className in toast.tsx).
		// happy-dom loads no Tailwind, so no computed style can observe the clip.
		const root = getToastRoot(container);
		expect(root).toBeInTheDocument();
		expect(root).not.toHaveClass("overflow-hidden");
		// queried through the root: the overhang only clears the border from inside
		const bar = root?.querySelector('[aria-hidden="true"]');
		expect(bar).not.toBeNull();
		expect(bar).toHaveClass("-inset-px");
	});
});

describe("makeToast", () => {
	const toastNode = (
		<Toast.Root intent="info">
			<Toast.Message>message</Toast.Message>
		</Toast.Root>
	);

	function spyOnCustom() {
		return vi.spyOn(ToastPrimitive.toast, "custom").mockReturnValue("stub-toast");
	}

	test.each([
		{ case: "a duration of 0 keeps the toast open", duration_ms: 0 },
		{ case: "a negative duration keeps the toast open", duration_ms: -1 },
	])("$case", ({ duration_ms }) => {
		const custom = spyOnCustom();

		makeToast(toastNode, { duration_ms });

		expect(custom).toHaveBeenCalledTimes(1);
		// <= 0 is documented as "until manually dismissed"; handing sonner the
		// raw 0 would make it inherit the Toaster default instead
		expect(custom.mock.lastCall?.[1]).toStrictEqual({
			duration: Number.POSITIVE_INFINITY,
			unstyled: true,
		});
	});

	test("passes a positive duration through untouched", () => {
		const custom = spyOnCustom();

		makeToast(toastNode, { duration_ms: 5000 });

		expect(custom).toHaveBeenCalledTimes(1);
		expect(custom.mock.lastCall?.[1]).toStrictEqual({ duration: 5000, unstyled: true });
	});

	test("leaves the duration unset so the Toaster's default applies, and omits the id key", () => {
		const custom = spyOnCustom();

		makeToast(toastNode);

		expect(custom).toHaveBeenCalledTimes(1);
		// `id` must be ABSENT rather than undefined — an explicit `id: undefined`
		// breaks sonner's toast identity
		expect(custom.mock.lastCall?.[1]).toStrictEqual({ duration: undefined, unstyled: true });
	});

	test("forwards a custom id", () => {
		const custom = spyOnCustom();

		makeToast(toastNode, { id: "billing-warning" });

		expect(custom).toHaveBeenCalledTimes(1);
		expect(custom.mock.lastCall?.[1]).toStrictEqual({
			duration: undefined,
			id: "billing-warning",
			unstyled: true,
		});
	});

	test("returns the id sonner assigns", () => {
		const custom = spyOnCustom();
		expect(makeToast(toastNode)).toBe("stub-toast");
		expect(custom).toHaveBeenCalledTimes(1);
	});
});

describe("Toaster", () => {
	test("marks its container as an overlay prompt, so interacting with a toast cannot close a modal", async () => {
		render(<Toaster />);
		// sonner only renders the list (and so the mantle classes) once a toast
		// exists, so create a real one
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
		expect(list).toHaveClass("overlay-prompt");
		expect(list).toContainElement(action);

		// the other half of the contract: the guard every mantle modal routes its
		// outside-interaction events through must match that class, or clicking a
		// toast action would dismiss the dialog underneath it
		const pointerDown = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
		action.dispatchEvent(pointerDown);
		preventCloseOnPromptInteraction(pointerDown);
		expect(pointerDown.defaultPrevented).toBe(true);
	});
});
