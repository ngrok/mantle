import { afterEach, describe, expect, test, vi } from "vitest";
import { announce, mountSharedStatus } from "./shared-status.js";

const region = (container: Element) =>
	container.querySelector<HTMLElement>(":scope > [data-slot='shared-status']");

afterEach(() => {
	document.body.replaceChildren();
});

describe("announce", () => {
	test("an element that unmounted announces nothing in a surviving region", async () => {
		const survivor = document.body.appendChild(document.createElement("button"));
		const gone = document.body.appendChild(document.createElement("button"));
		mountSharedStatus(survivor);
		const unmount = mountSharedStatus(gone);
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

		// Why empty until the frame: a screen reader skips a region that is made and filled at once.
		expect(status).toHaveTextContent("");
		await vi.waitFor(() => {
			expect(writes).toEqual(["Light theme"]);
		});
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
			// Why a frame: a new region gets its first message one frame later.
			announce(button, "Dark theme");
			vi.advanceTimersToNextFrame();
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
