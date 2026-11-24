import { afterEach, describe, expect, test, vi } from "vitest";
import { announce, mountSharedStatus } from "./shared-status.js";

const region = (container: Element) =>
	container.querySelector<HTMLElement>(":scope > [data-slot='shared-status']");

/** Waits until a new region takes messages: after the next paint. */
const afterPaint = () =>
	new Promise((resolve) => {
		requestAnimationFrame(() => setTimeout(resolve));
	});

afterEach(() => {
	document.body.replaceChildren();
});

describe("announce", () => {
	test("an element that unmounted announces nothing in a surviving region", async () => {
		const survivor = document.body.appendChild(document.createElement("button"));
		const gone = document.body.appendChild(document.createElement("button"));
		mountSharedStatus(survivor);
		const unmount = mountSharedStatus(gone);
		await afterPaint();
		announce(survivor, "Dark theme");

		if (typeof unmount === "function") {
			unmount();
		}
		// Why: a copy that finishes after its button unmounted must not replace another message.
		announce(gone, "Copied", { repeat: true });

		await Promise.resolve();
		expect(region(document.body)).toHaveTextContent("Dark theme");
	});

	test("a moved element writes once to its new region, with the latest message", async () => {
		const button = document.body.appendChild(document.createElement("button"));
		const dialog = document.body.appendChild(document.createElement("dialog"));
		mountSharedStatus(button);
		dialog.append(button);
		const writes: string[] = [];

		announce(button, "Dark theme");
		const status = region(dialog);
		if (status == null) {
			throw new Error("The dialog has no shared region.");
		}
		new MutationObserver(() => writes.push(status.textContent ?? "")).observe(status, {
			childList: true,
			characterData: true,
			subtree: true,
		});
		// Why twice: the theme provider can call its updater twice for one press.
		announce(button, "Dark theme");
		announce(button, "Light theme");

		// Why empty until the paint: a screen reader skips a region that is made and filled at once.
		expect(status).toHaveTextContent("");
		await vi.waitFor(() => {
			expect(writes).toEqual(["Light theme"]);
		});
	});

	test("an element that unmounted before the frame does not write its queued message", async () => {
		const dialog = document.body.appendChild(document.createElement("dialog"));
		const survivor = dialog.appendChild(document.createElement("button"));
		const gone = document.body.appendChild(document.createElement("button"));
		const unmount = mountSharedStatus(gone);
		// Why the move: it makes the dialog's region, so the message waits a frame.
		dialog.append(gone);
		announce(gone, "Copied", { repeat: true });
		mountSharedStatus(survivor);
		if (typeof unmount === "function") {
			unmount();
		}

		await afterPaint();
		expect(region(dialog)).toHaveTextContent("");
	});

	test("an element that moved back before the paint announces in its new region", async () => {
		const button = document.body.appendChild(document.createElement("button"));
		const dialog = document.body.appendChild(document.createElement("dialog"));
		mountSharedStatus(button);
		await afterPaint();
		dialog.append(button);
		announce(button, "Copied", { repeat: true });
		// Why: a dialog that closes before the paint moves the button back to the page.
		document.body.append(button);

		await afterPaint();
		expect(region(dialog)).toBeNull();
		expect(region(document.body)).toHaveTextContent("Copied");
	});

	test("an element out of the document announces nothing", async () => {
		const host = document.body.appendChild(document.createElement("div"));
		const survivor = document.body.appendChild(document.createElement("button"));
		const detached = host.appendChild(document.createElement("button"));
		mountSharedStatus(survivor);
		mountSharedStatus(detached);
		await afterPaint();
		announce(survivor, "Dark theme");
		// Why: a portal host can leave the page while its React root stays mounted.
		host.remove();

		announce(detached, "Copied", { repeat: true });
		expect(region(document.body)).toHaveTextContent("Dark theme");
	});

	test("announces in the modal around a shadow root, and in an ARIA modal", () => {
		const dialog = document.body.appendChild(document.createElement("dialog"));
		const shadow = dialog.appendChild(document.createElement("div")).attachShadow({ mode: "open" });
		const inShadow = shadow.appendChild(document.createElement("button"));
		const modal = document.body.appendChild(document.createElement("div"));
		modal.setAttribute("aria-modal", "true");
		const inModal = modal.appendChild(document.createElement("button"));

		mountSharedStatus(inShadow);
		mountSharedStatus(inModal);
		expect(region(dialog)).not.toBeNull();
		expect(region(modal)).not.toBeNull();
	});
});

describe("the shared region", () => {
	test("clears seven seconds after the latest message, not the first", () => {
		vi.useFakeTimers();
		try {
			const dialog = document.body.appendChild(document.createElement("dialog"));
			const button = dialog.appendChild(document.createElement("button"));
			mountSharedStatus(button);
			const status = region(dialog);
			if (status == null) {
				throw new Error("The dialog has no shared region.");
			}
			expect(status).toHaveAttribute("aria-atomic", "true");
			// Why a frame and a timeout: a new region gets its first message after a paint.
			announce(button, "Dark theme");
			vi.advanceTimersToNextFrame();
			vi.advanceTimersByTime(1);
			expect(status).toHaveTextContent("Dark theme");

			vi.advanceTimersByTime(6000);
			announce(button, "Light theme");
			// Why: a clear timed from the first message would empty the region here.
			vi.advanceTimersByTime(2000);
			expect(status).toHaveTextContent("Light theme");

			vi.advanceTimersByTime(5000);
			expect(status).toBeEmptyDOMElement();
		} finally {
			vi.useRealTimers();
		}
	});
});
