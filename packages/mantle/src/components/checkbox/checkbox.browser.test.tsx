"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Checkbox } from "./checkbox.js";

describe("Checkbox (browser)", () => {
	test('checked="indeterminate" sets the native indeterminate DOM property while staying controlled', async () => {
		const { rerender } = render(<Checkbox checked="indeterminate" onChange={() => {}} />);
		const checkbox = screen.getByRole<HTMLInputElement>("checkbox");

		// The indeterminate *visual* comes from the native DOM property, applied
		// imperatively in an effect — independent of `checked`, which stays a
		// controlled boolean (never `undefined`, which would flip the input to
		// uncontrolled). `waitFor` lets the effect flush after the commit.
		await waitFor(() => expect(checkbox.indeterminate).toBe(true));
		expect(checkbox.checked).toBe(false);

		// Resolving to a concrete boolean clears indeterminate and stays controlled.
		rerender(<Checkbox checked={true} onChange={() => {}} />);
		await waitFor(() => expect(checkbox.indeterminate).toBe(false));
		expect(checkbox.checked).toBe(true);
	});

	test('defaultChecked="indeterminate" sets the native indeterminate DOM property on the uncontrolled path', async () => {
		// The uncontrolled path emits no `aria-checked` (that reads the controlled
		// `checked`), so the native DOM property is the only observable signal —
		// it drives both the dash and the AX "mixed" state.
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		render(<Checkbox aria-label="Select all" defaultChecked="indeterminate" />);
		const checkbox = screen.getByRole<HTMLInputElement>("checkbox");

		await waitFor(() => expect(checkbox.indeterminate).toBe(true));
		expect(checkbox.checked).toBe(false);

		// Per the HTML spec a real click clears `indeterminate` — the effect is
		// keyed on the *stable* initial `defaultChecked`, so it must not reapply it.
		const user = userEvent.setup();
		await user.click(checkbox);

		expect(checkbox.indeterminate).toBe(false);
		expect(checkbox.checked).toBe(true);
		const messages = errorSpy.mock.calls.map((args) => args.map(String).join(" "));
		expect(messages.filter((message) => message.includes("uncontrolled"))).toEqual([]);
	});
});
