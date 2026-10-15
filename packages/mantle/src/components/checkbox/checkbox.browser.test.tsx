"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import { Checkbox } from "./checkbox.js";

test('checked="indeterminate" sets the native indeterminate DOM property while staying controlled', async () => {
	const { rerender } = render(<Checkbox checked="indeterminate" onChange={() => {}} />);
	const checkbox = screen.getByRole<HTMLInputElement>("checkbox");

	// Why waitFor: a layout effect writes the DOM-only `indeterminate` property after
	// the commit. `checked` stays a controlled boolean, so the input never flips to
	// uncontrolled.
	await waitFor(() => expect(checkbox.indeterminate).toBe(true));
	expect(checkbox.checked).toBe(false);

	// A concrete boolean clears `indeterminate` and keeps the input controlled.
	rerender(<Checkbox checked={true} onChange={() => {}} />);
	await waitFor(() => expect(checkbox.indeterminate).toBe(false));
	expect(checkbox.checked).toBe(true);
});

test('defaultChecked="indeterminate" sets the native indeterminate DOM property on the uncontrolled path', async () => {
	const user = userEvent.setup();
	render(<Checkbox aria-label="Select all" defaultChecked="indeterminate" />);
	const checkbox = screen.getByRole<HTMLInputElement>("checkbox");

	// The uncontrolled path emits no `aria-checked`, so the DOM property is the only
	// observable of the mixed state. The input must not read the value as `checked`.
	await waitFor(() => expect(checkbox.indeterminate).toBe(true));
	expect(checkbox.checked).toBe(false);

	// Why a real click: the HTML spec clears `indeterminate` on activation, and the
	// effect keys on the stable initial `defaultChecked`, so it must not reapply it.
	await user.click(checkbox);

	expect(checkbox.indeterminate).toBe(false);
	expect(checkbox.checked).toBe(true);
});
