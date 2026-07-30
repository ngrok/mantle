"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { Command } from "./command.js";

/**
 * A minimal controlled Command.Dialog subject for testing open/close behavior.
 */
const CommandDialogSubject = ({ initialOpen = false }: { initialOpen?: boolean }) => {
	const [open, setOpen] = useState(initialOpen);

	return (
		<Command.DialogRoot open={open} onOpenChange={setOpen}>
			<button type="button" onClick={() => setOpen(true)}>
				Open
			</button>
			<Command.DialogContent title="Test Command Palette">
				<Command.Input placeholder="Type a command or search..." />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						<Command.Item>Calendar</Command.Item>
						<Command.Item>Search Emoji</Command.Item>
					</Command.Group>
					<Command.Separator />
					<Command.Group heading="Settings">
						<Command.Item>Profile</Command.Item>
						<Command.Item>Billing</Command.Item>
					</Command.Group>
				</Command.List>
			</Command.DialogContent>
		</Command.DialogRoot>
	);
};

describe("Command.Dialog (browser)", () => {
	describe("open/close lifecycle", () => {
		test("pressing Escape closes the dialog", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(screen.queryByText("Test Command Palette")).not.toBeInTheDocument();
			});
		});

		test("Command.DialogTrigger opens the dialog without managed state", async () => {
			const user = userEvent.setup();
			render(
				<Command.DialogRoot>
					<Command.DialogTrigger>Open</Command.DialogTrigger>
					<Command.DialogContent title="Test Command Palette">
						<Command.Input placeholder="Type a command or search..." />
						<Command.List>
							<Command.Empty>No results found.</Command.Empty>
						</Command.List>
					</Command.DialogContent>
				</Command.DialogRoot>,
			);

			expect(screen.queryByText("Test Command Palette")).not.toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Open" }));

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});
		});

		test("clicking the close button closes the dialog", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});

			await user.click(screen.getByRole("button", { name: "Close Dialog" }));

			await waitFor(() => {
				expect(screen.queryByText("Test Command Palette")).not.toBeInTheDocument();
			});
		});
	});

	describe("Command.SearchTrigger", () => {
		/**
		 * A palette with a real `Command.List`, which is what makes these tests
		 * browser-mode: cmdk's list measures itself with a `ResizeObserver`, and
		 * filtering is the whole point of seeding a query.
		 */
		const SearchTriggerSubject = () => (
			<Command.DialogRoot>
				<Command.SearchTrigger>
					<button type="button">Search…</button>
				</Command.SearchTrigger>
				<Command.DialogContent title="Test Command Palette">
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Group heading="Suggestions">
							<Command.Item>Calendar</Command.Item>
							<Command.Item>Endpoints</Command.Item>
						</Command.Group>
					</Command.List>
				</Command.DialogContent>
			</Command.DialogRoot>
		);

		test("a keystroke on the trigger seeds the query and filters the list", async () => {
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			const trigger = screen.getByRole("button", { name: "Search…" });
			trigger.focus();
			// "p" appears in "Endpoints" and not in "Calendar", so the filtering is
			// what the assertion below observes rather than cmdk's fuzzy tolerance.
			await user.keyboard("p");

			const input = await screen.findByPlaceholderText("Type a command or search...");
			expect(input).toHaveValue("p");
			// The seed has to reach cmdk's own search state, not just the field's
			// value — otherwise the palette opens showing text that filters nothing.
			await waitFor(() => {
				expect(screen.getByText("Endpoints")).toBeInTheDocument();
			});
			expect(screen.queryByText("Calendar")).not.toBeInTheDocument();
		});

		test("keystrokes after the first continue into the palette input", async () => {
			// The race the seeding exists to close: the palette's input has to be
			// mounted and focused before the next keypress lands, or characters are
			// dropped between the trigger and the field.
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			screen.getByRole("button", { name: "Search…" }).focus();
			await user.keyboard("e");
			const input = await screen.findByPlaceholderText("Type a command or search...");
			await waitFor(() => {
				expect(input).toHaveFocus();
			});

			await user.keyboard("nd");

			expect(input).toHaveValue("end");
		});

		test("focus returns to the search trigger after dismissal", async () => {
			// Free from rendering as a Dialog.Trigger. A hand-rolled trigger has to
			// capture and restore the focused element itself, and gets it wrong.
			const user = userEvent.setup();
			render(<SearchTriggerSubject />);

			const trigger = screen.getByRole("button", { name: "Search…" });
			await user.click(trigger);
			await screen.findByPlaceholderText("Type a command or search...");

			await user.keyboard("{Escape}");

			await waitFor(() => {
				expect(trigger).toHaveFocus();
			});
		});
	});

	describe("Command.Separator auto-hide", () => {
		test("separator is visible when there is no active search query", async () => {
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});

			expect(document.querySelector("[data-slot='command-separator']")).toBeInTheDocument();
		});

		test("separator is hidden when a search query is active", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});

			await user.type(screen.getByPlaceholderText("Type a command or search..."), "cal");

			await waitFor(() => {
				expect(document.querySelector("[data-slot='command-separator']")).not.toBeInTheDocument();
			});
		});

		test("separator reappears when the search query is cleared", async () => {
			const user = userEvent.setup();
			render(<CommandDialogSubject initialOpen />);

			await waitFor(() => {
				expect(screen.getByText("Test Command Palette")).toBeInTheDocument();
			});

			const input = screen.getByPlaceholderText("Type a command or search...");
			await user.type(input, "cal");

			await waitFor(() => {
				expect(document.querySelector("[data-slot='command-separator']")).not.toBeInTheDocument();
			});

			await user.clear(input);

			await waitFor(() => {
				expect(document.querySelector("[data-slot='command-separator']")).toBeInTheDocument();
			});
		});
	});
});
