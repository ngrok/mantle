import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as PromptInput from "./prompt-input-parts.js";

test("a consumer types a message and sends it with Enter", async () => {
	const user = userEvent.setup();
	const onSubmit = vi.fn<(message: FormDataEntryValue | null) => void>();
	render(
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(new FormData(event.currentTarget).get("message"));
			}}
		>
			<PromptInput.TextArea aria-label="Message" name="message" />
			<PromptInput.Footer>
				<PromptInput.Submit />
			</PromptInput.Footer>
		</PromptInput.Root>,
	);

	await user.type(screen.getByRole("textbox", { name: "Message" }), "List my endpoints{Enter}");
	expect(onSubmit).toHaveBeenCalledWith("List my endpoints");
});
