"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
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
});
