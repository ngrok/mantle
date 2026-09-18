"use client";

import { render, screen, waitFor } from "@testing-library/react";
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
