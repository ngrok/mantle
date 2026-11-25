import { expect, test } from "vitest";
import { mountSharedStatus } from "./shared-status.js";

// Why a browser: happy-dom has no `assignedSlot`.
test("puts the region in a dialog that a slot places the element in", () => {
	const host = document.body.appendChild(document.createElement("div"));
	const dialog = host.attachShadow({ mode: "open" }).appendChild(document.createElement("dialog"));
	dialog.appendChild(document.createElement("slot"));
	const button = host.appendChild(document.createElement("button"));

	const cleanup = mountSharedStatus(button);
	try {
		expect(dialog.querySelector(":scope > [data-slot='shared-status']")).not.toBeNull();
	} finally {
		if (typeof cleanup === "function") {
			cleanup();
		}
		host.remove();
	}
});
