import { render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Tooltip } from "../tooltip/index.js";
import * as PromptInput from "./prompt-input-parts.js";

// Why browser mode: these tests depend on native form activation and constraint validation.
test("Enter activates the default button and preserves its submitter overrides", async () => {
	const onSubmit = vi.fn<(submitter: HTMLElement | null) => void>();
	render(
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(event.nativeEvent.submitter);
			}}
		>
			<PromptInput.TextArea aria-label="Message" required />
			<PromptInput.Submit formNoValidate />
		</PromptInput.Root>,
	);

	await userEvent.click(screen.getByRole("textbox", { name: "Message" }));
	await userEvent.keyboard("{Enter}");

	expect(onSubmit).toHaveBeenCalledTimes(1);
	expect(onSubmit).toHaveBeenLastCalledWith(screen.getByRole("button", { name: "Send message" }));
});

test("Send submits when composed with a tooltip trigger", async () => {
	const onSubmit = vi.fn<() => void>();
	render(
		<PromptInput.Root
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			<PromptInput.TextArea aria-label="Message" />
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<PromptInput.Submit />
				</Tooltip.Trigger>
			</Tooltip.Root>
		</PromptInput.Root>,
	);

	await userEvent.click(screen.getByRole("button", { name: "Send message" }));

	expect(onSubmit).toHaveBeenCalledTimes(1);
	expect(onSubmit).toHaveBeenLastCalledWith();
});

test.each([false, true])(
	"Enter respects an iframe's default button (disabled=%s)",
	async (disabled) => {
		const frame = document.createElement("iframe");
		frame.srcdoc = "<!doctype html><title>Composer</title>";
		await new Promise((resolve) => {
			frame.addEventListener("load", resolve, { once: true });
			document.body.append(frame);
		});
		const frameDocument = frame.contentDocument;
		if (frameDocument == null) {
			throw new Error("The frame has no document.");
		}
		const onSubmit = vi.fn<(submitter: HTMLElement | null) => void>();
		const { unmount } = render(
			createPortal(
				<PromptInput.Root
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit(event.nativeEvent.submitter);
					}}
				>
					<PromptInput.TextArea aria-label="Message" required={!disabled} />
					<PromptInput.Submit disabled={disabled} formNoValidate />
				</PromptInput.Root>,
				frameDocument.body,
			),
		);
		try {
			const fields = within(frameDocument.body);
			fields.getByRole("textbox", { name: "Message" }).focus();
			await userEvent.keyboard("{Enter}");

			expect(onSubmit.mock.calls).toEqual(
				disabled ? [] : [[fields.getByRole("button", { name: "Send message" })]],
			);
		} finally {
			unmount();
			frame.remove();
		}
	},
);

test.each(["fieldset", "external image"])(
	"Enter respects a disabled default button (%s)",
	async (kind) => {
		const onSubmit = vi.fn<() => void>();
		render(
			<>
				{kind === "external image" && (
					<input type="image" alt="Send image" form="composer" disabled />
				)}
				<PromptInput.Root
					id="composer"
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
					}}
				>
					<PromptInput.TextArea aria-label="Message" />
					<fieldset disabled={kind === "fieldset"}>
						<PromptInput.Submit />
					</fieldset>
				</PromptInput.Root>
			</>,
		);

		await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "next question");
		await userEvent.keyboard("{Enter}");

		expect(onSubmit).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("next question");
	},
);

test.each(["next draft", "double-click"])(
	"stopping an answer does not submit again (%s)",
	async (action) => {
		const onSubmit = vi.fn<() => void>();
		const onStop = vi.fn<() => void>();
		function Composer() {
			const [streaming, setStreaming] = useState(false);
			return (
				<PromptInput.Root
					streaming={streaming}
					onStop={() => {
						onStop();
						setStreaming(false);
					}}
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit();
						setStreaming(true);
					}}
				>
					<PromptInput.TextArea aria-label="Message" />
					<PromptInput.Submit />
				</PromptInput.Root>
			);
		}
		render(<Composer />);
		await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "first question");
		const button = screen.getByRole("button", { name: "Send message" });
		if (action === "double-click") {
			await userEvent.dblClick(button);
		} else {
			await userEvent.click(button);
			await userEvent.fill(screen.getByRole("textbox", { name: "Message" }), "next question");
			await userEvent.click(screen.getByRole("button", { name: "Stop answer" }));
		}

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onStop).toHaveBeenLastCalledWith();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenLastCalledWith();
		expect(screen.getByRole("button", { name: "Send message" })).toBe(button);
		expect(button).toHaveFocus();
		expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
			action === "double-click" ? "first question" : "next question",
		);
	},
);

/** A stand-in for the browser's speech recognition that the test drives. */
class FakeRecognition {
	static last: FakeRecognition | undefined;
	continuous = false;
	interimResults = true;
	lang = "";
	onresult: ((event: unknown) => void) | null = null;
	onend: (() => void) | null = null;
	start() {}
	stop() {
		this.onend?.();
	}
	abort() {}

	constructor() {
		FakeRecognition.last = this;
	}

	hear(transcript: string, isFinal: boolean) {
		this.onresult?.({ resultIndex: 0, results: [{ isFinal, 0: { transcript } }] });
	}
}

// Why browser mode: React must see the dictated text as a native edit for a controlled field's onChange.
test("Dictate types each final phrase at the caret into a controlled draft", async () => {
	vi.stubGlobal("SpeechRecognition", FakeRecognition);
	vi.stubGlobal("webkitSpeechRecognition", undefined);
	try {
		const onSubmit = vi.fn<(message: string) => void>();
		function Composer() {
			const [draft, setDraft] = useState("");
			return (
				<PromptInput.Root
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit(draft);
					}}
				>
					<PromptInput.TextArea
						aria-label="Message"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
					/>
					<PromptInput.Dictate />
					<PromptInput.Submit />
				</PromptInput.Root>
			);
		}
		render(<Composer />);
		const field = screen.getByRole("textbox", { name: "Message" });
		await userEvent.click(field);
		await userEvent.keyboard("Hi there");
		// Put the caret after "Hi", so the phrase goes in the middle.
		if (field instanceof HTMLTextAreaElement) {
			field.setSelectionRange(2, 2);
		}

		await userEvent.click(screen.getByRole("button", { name: "Dictate" }));
		FakeRecognition.last?.hear("list my", false);
		FakeRecognition.last?.hear("list my endpoints", true);

		await expect.poll(() => field).toHaveValue("Hi list my endpoints there");
		await userEvent.click(screen.getByRole("button", { name: "Send message" }));
		expect(onSubmit).toHaveBeenLastCalledWith("Hi list my endpoints there");
	} finally {
		vi.unstubAllGlobals();
	}
});
