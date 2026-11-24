import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as OtpInput from "./otp-input-parts.js";

test("a consumer types a code into the input by role", async () => {
	const user = userEvent.setup();
	const onComplete = vi.fn<(value: string) => void>();
	render(
		<OtpInput.Root maxLength={4} aria-label="Code" onComplete={onComplete}>
			<OtpInput.Group>
				<OtpInput.Slot index={0} />
				<OtpInput.Slot index={1} />
				<OtpInput.Slot index={2} />
				<OtpInput.Slot index={3} />
			</OtpInput.Group>
		</OtpInput.Root>,
	);

	await user.type(screen.getByRole("textbox", { name: "Code" }), "1234");

	expect(onComplete).toHaveBeenLastCalledWith("1234");
});
