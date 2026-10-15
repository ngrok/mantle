import { afterEach, describe, expect, test } from "vitest";
import { preventCloseOnPromptInteraction } from "./prevent-close-on-prompt-interaction.js";

/**
 * Dispatches a cancelable pointerdown on `node` and returns the event with its
 * `target` populated — the only way to hand the guard a real event whose target
 * is the node under test (a hand-rolled object would need a type assertion).
 */
function pointerDownOn(node: EventTarget): MouseEvent {
	const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
	node.dispatchEvent(event);
	return event;
}

describe("preventCloseOnPromptInteraction", () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	test("cancels the event when the target sits inside an overlay prompt", () => {
		// The `.overlay-prompt` class is the contract `Toaster` stamps on its
		// container so a toast action can be clicked without dismissing the modal
		// underneath it (see toast.test.tsx for the paired half).
		const prompt = document.createElement("div");
		prompt.className = "overlay-prompt";
		const action = document.createElement("button");
		prompt.append(action);
		document.body.append(prompt);

		const event = pointerDownOn(action);
		expect(event.target).toBe(action);
		expect(event.defaultPrevented).toBe(false);

		preventCloseOnPromptInteraction(event);

		expect(event.defaultPrevented).toBe(true);
	});

	test("cancels the event when the target is the overlay prompt itself", () => {
		const prompt = document.createElement("div");
		prompt.className = "overlay-prompt";
		document.body.append(prompt);

		const event = pointerDownOn(prompt);

		preventCloseOnPromptInteraction(event);

		expect(event.defaultPrevented).toBe(true);
	});

	test("leaves the event alone when the target is outside every overlay prompt", () => {
		const prompt = document.createElement("div");
		prompt.className = "overlay-prompt";
		const outside = document.createElement("button");
		document.body.append(prompt, outside);

		const event = pointerDownOn(outside);

		preventCloseOnPromptInteraction(event);

		// a genuine outside interaction must still close the modal
		expect(event.defaultPrevented).toBe(false);
	});

	test("ignores a non-Element target instead of throwing", () => {
		// window/document-retargeted events have no `closest` — the guard's
		// `instanceof Element` check is what keeps them from throwing.
		const event = pointerDownOn(window);
		expect(event.target).not.toBeInstanceOf(Element);

		preventCloseOnPromptInteraction(event);

		expect(event.defaultPrevented).toBe(false);
	});
});
