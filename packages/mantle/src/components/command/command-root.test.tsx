import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StrictMode, type ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import * as Command from "./command-parts.js";
import { useCommandState } from "./command.js";

const ActiveValue = () => (
	<output aria-label="active">{useCommandState((state) => state.value)}</output>
);

/** An inline palette: two groups and one ungrouped item, in a fixed order. */
const Palette = ({
	children,
	onSelect,
	...props
}: Omit<ComponentProps<typeof Command.Root>, "onSelect"> & {
	onSelect?: (value: string) => void;
}) => (
	<Command.Root {...props}>
		<Command.Input placeholder="Search" />
		<Command.List>
			<Command.Empty>No results found.</Command.Empty>
			<Command.Group heading="Suggestions">
				<Command.Item onSelect={onSelect}>Calendar</Command.Item>
				<Command.Item onSelect={onSelect} disabled>
					Calculator
				</Command.Item>
				<Command.Item onSelect={onSelect} keywords={["face"]}>
					Search Emoji
				</Command.Item>
			</Command.Group>
			<Command.Separator />
			<Command.Group heading="Settings">
				<Command.Item onSelect={onSelect}>Profile</Command.Item>
				<Command.Item onSelect={onSelect}>Billing</Command.Item>
			</Command.Group>
		</Command.List>
		<ActiveValue />
		{children}
	</Command.Root>
);

const input = () => screen.getByRole("combobox");
const optionNames = () => screen.getAllByRole("option").map((option) => option.textContent);
const active = () => {
	const id = input().getAttribute("aria-activedescendant");
	return id == null ? null : document.getElementById(id);
};

describe("Command.Input name", () => {
	test("is Search with no other name, and the input's own name replaces it", () => {
		render(
			<>
				<Command.Root>
					<Command.Input />
				</Command.Root>
				<Command.Root>
					<Command.Input aria-label="Find a command" />
				</Command.Root>
				<label htmlFor="palette-input">Jump to</label>
				<Command.Root>
					<Command.Input id="palette-input" />
				</Command.Root>
			</>,
		);
		expect(screen.getByRole("combobox", { name: "Search" })).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "Find a command" })).toBeInTheDocument();
		expect(screen.getByRole("combobox", { name: "Jump to" })).toBeInTheDocument();
	});
});

describe("Command.Root filtering", () => {
	test("hides the items and groups that the query does not match, and names the active item", async () => {
		const user = userEvent.setup();
		render(<Palette />);

		await user.type(input(), "bil");

		expect(optionNames()).toEqual(["Billing"]);
		expect(screen.queryByRole("group", { name: "Suggestions" })).not.toBeInTheDocument();
		expect(screen.getByRole("group", { name: "Settings" })).toBeInTheDocument();
		expect(active()).toHaveTextContent("Billing");
		expect(active()).toHaveAttribute("aria-selected", "true");
		expect(active()).toHaveAttribute("data-highlighted");
	});

	test("matches an item by its keywords", async () => {
		const user = userEvent.setup();
		render(<Palette />);

		await user.type(input(), "face");

		expect(optionNames()).toEqual(["Search Emoji"]);
	});

	test("sorts the matches by score, the groups by their best item", async () => {
		const user = userEvent.setup();
		render(<Palette />);

		// "e" starts the word "Emoji", and only matches a letter inside "Calendar" and "Profile".
		await user.type(input(), "e");
		expect(optionNames()).toEqual(["Search Emoji", "Calendar", "Profile"]);

		// "ro" starts a syllable of "Profile" (0.17), and scores lower in "Calculator" and "Search Emoji".
		await user.clear(input());
		await user.type(input(), "ro");
		expect(optionNames()).toEqual(["Profile", "Calculator", "Search Emoji"]);
		const groups = screen
			.getAllByRole("group")
			.map((group) => group.getAttribute("aria-labelledby"));
		expect(groups.map((id) => document.getElementById(id ?? "")?.textContent)).toEqual([
			"Settings",
			"Suggestions",
		]);
	});

	test("an empty query restores the items to their first order", async () => {
		const user = userEvent.setup();
		render(<Palette />);

		await user.type(input(), "ro");
		expect(optionNames()[0]).toBe("Profile");
		await user.clear(input());

		expect(optionNames()).toEqual(["Calendar", "Calculator", "Search Emoji", "Profile", "Billing"]);
		expect(active()).toHaveTextContent("Calendar");
	});

	test("an item appended during a query stays after the others when the query clears", async () => {
		const user = userEvent.setup();
		const Items = ({ names }: { names: string[] }) => (
			<Command.Root>
				<Command.Input />
				<Command.List>
					{names.map((name) => (
						<Command.Item key={name}>{name}</Command.Item>
					))}
				</Command.List>
			</Command.Root>
		);
		const { rerender } = render(<Items names={["Xab", "Abx"]} />);
		await user.type(input(), "a");
		expect(optionNames()).toEqual(["Abx", "Xab"]);

		rerender(<Items names={["Xab", "Abx", "Zed"]} />);
		// A new query after the mount sorts again, and the last match must not move past the new item.
		await user.type(input(), "x", { initialSelectionStart: 0, initialSelectionEnd: 1 });
		expect(optionNames()).toEqual(["Xab", "Abx"]);
		await user.clear(input());

		await vi.waitFor(() => expect(optionNames()).toEqual(["Xab", "Abx", "Zed"]));
	});

	test("an item prepended during a query goes first when the query clears", async () => {
		const user = userEvent.setup();
		const scores: Record<string, number> = { Bee: 1, Cat: 0.9, Ant: 0.5 };
		const Items = ({ names }: { names: string[] }) => (
			<Command.Root filter={(value) => scores[value] ?? 0}>
				<Command.Input />
				<Command.List>
					{names.map((name) => (
						<Command.Item key={name}>{name}</Command.Item>
					))}
				</Command.List>
			</Command.Root>
		);
		const { rerender } = render(<Items names={["Ant", "Bee", "Cat"]} />);
		await user.type(input(), "q");
		expect(optionNames()).toEqual(["Bee", "Cat", "Ant"]);

		// React puts "New" before the node of "Ant", which the sort moved to the end.
		rerender(<Items names={["New", "Ant", "Bee", "Cat"]} />);
		await user.clear(input());

		await vi.waitFor(() => expect(optionNames()).toEqual(["New", "Ant", "Bee", "Cat"]));
	});

	test("shows the empty state and counts no match for a query that matches nothing", async () => {
		const user = userEvent.setup();
		const Count = () => (
			<output aria-label="count">{useCommandState((state) => state.filtered.count)}</output>
		);
		render(
			<Palette>
				<Count />
			</Palette>,
		);
		expect(screen.getByLabelText("count")).toHaveTextContent("5");

		await user.type(input(), "zzz");

		expect(screen.getByText("No results found.")).toBeInTheDocument();
		expect(screen.getByLabelText("count")).toHaveTextContent("0");
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("a forceMount item shows for every query and does not count as a match", async () => {
		const user = userEvent.setup();
		render(
			<Command.Root>
				<Command.Input />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Item>Calendar</Command.Item>
					<Command.Item forceMount>Search everything</Command.Item>
				</Command.List>
			</Command.Root>,
		);

		await user.type(input(), "zzz");

		expect(optionNames()).toEqual(["Search everything"]);
		expect(screen.getByText("No results found.")).toBeInTheDocument();
	});

	test("a forceMount group stays visible for every query, with no matching item", async () => {
		const user = userEvent.setup();
		render(
			<Command.Root>
				<Command.Input />
				<Command.List>
					<Command.Item>Calendar</Command.Item>
					<Command.Group heading="Results" forceMount>
						<div>Loading…</div>
					</Command.Group>
				</Command.List>
			</Command.Root>,
		);

		await user.type(input(), "zzz");

		expect(screen.getByRole("group", { name: "Results" })).toBeInTheDocument();
	});

	test("an item that mounts during a query is filtered against it", async () => {
		const user = userEvent.setup();
		const Items = ({ names }: { names: string[] }) => (
			<Command.Root>
				<Command.Input />
				<Command.List>
					{names.map((name) => (
						<Command.Item key={name}>{name}</Command.Item>
					))}
				</Command.List>
			</Command.Root>
		);
		const { rerender } = render(<Items names={["Calendar"]} />);
		await user.type(input(), "pro");

		rerender(<Items names={["Calendar", "Profile", "Billing"]} />);

		await vi.waitFor(() => expect(optionNames()).toEqual(["Profile"]));
		expect(active()).toHaveTextContent("Profile");
	});
});

test("the empty state shows once the last item unmounts", async () => {
	const Items = ({ names }: { names: string[] }) => (
		<Command.Root shouldFilter={false}>
			<Command.Input />
			<Command.List>
				<Command.Empty>No results found.</Command.Empty>
				{names.map((name) => (
					<Command.Item key={name}>{name}</Command.Item>
				))}
			</Command.List>
		</Command.Root>
	);
	const { rerender } = render(<Items names={["Calendar"]} />);

	rerender(<Items names={[]} />);

	expect(await screen.findByText("No results found.")).toBeInTheDocument();
});

describe("Command.Root keyboard", () => {
	test("in StrictMode, only the active item has data-highlighted", async () => {
		const user = userEvent.setup();
		render(
			<StrictMode>
				<Palette />
			</StrictMode>,
		);

		await user.type(input(), "{ArrowDown}");

		const selected = document.querySelectorAll("[data-highlighted]");
		expect(Array.from(selected, (option) => option.textContent)).toEqual(["Search Emoji"]);
	});

	test("the arrows move the active item and skip a disabled one, with no wrap", async () => {
		const user = userEvent.setup();
		render(<Palette />);
		expect(active()).toHaveTextContent("Calendar");

		await user.type(input(), "{ArrowDown}");
		expect(active()).toHaveTextContent("Search Emoji");

		await user.type(input(), "{End}{ArrowDown}");
		expect(active()).toHaveTextContent("Billing");

		await user.type(input(), "{Home}{ArrowUp}");
		expect(active()).toHaveTextContent("Calendar");
		expect(screen.getByLabelText("active")).toHaveTextContent("Calendar");
	});

	test("loop wraps the arrows at both ends", async () => {
		const user = userEvent.setup();
		render(<Palette loop />);

		await user.type(input(), "{ArrowUp}");
		expect(active()).toHaveTextContent("Billing");

		await user.type(input(), "{ArrowDown}");
		expect(active()).toHaveTextContent("Calendar");
	});

	test("Alt with an arrow moves to the next or previous group", async () => {
		const user = userEvent.setup();
		render(<Palette />);

		await user.type(input(), "{Alt>}{ArrowDown}{/Alt}");
		expect(active()).toHaveTextContent("Profile");

		await user.type(input(), "{Alt>}{ArrowUp}{/Alt}");
		expect(active()).toHaveTextContent("Calendar");
	});

	test("Ctrl+N and Ctrl+P move like the arrows, unless vimBindings is false", async () => {
		const user = userEvent.setup();
		const { unmount } = render(<Palette />);

		await user.type(input(), "{Control>}n{/Control}");
		expect(active()).toHaveTextContent("Search Emoji");
		await user.type(input(), "{Control>}p{/Control}");
		expect(active()).toHaveTextContent("Calendar");
		unmount();

		render(<Palette vimBindings={false} />);
		await user.type(input(), "{Control>}n{/Control}");
		expect(active()).toHaveTextContent("Calendar");
	});

	test("Enter selects the active item with its value, and a click selects the item under it", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn<(value: string) => void>();
		render(<Palette onSelect={onSelect} />);

		await user.type(input(), "{ArrowDown}{Enter}");
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenLastCalledWith("Search Emoji");

		await user.click(screen.getByRole("option", { name: "Profile" }));
		expect(onSelect).toHaveBeenCalledTimes(2);
		expect(onSelect).toHaveBeenLastCalledWith("Profile");
		expect(active()).toHaveTextContent("Profile");
		expect(input()).toHaveFocus();
	});

	test("a disabled item ignores a click", async () => {
		// Why no pointer-events check: the disabled item's `pointer-events: none` lives in a class happy-dom never applies.
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onSelect = vi.fn<(value: string) => void>();
		render(<Palette onSelect={onSelect} />);

		await user.click(screen.getByRole("option", { name: "Calculator" }));

		expect(onSelect).toHaveBeenCalledTimes(0);
	});

	test("Enter on an asChild link runs onSelect and does not click the link", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<(event: { preventDefault: () => void }) => void>((event) => {
			event.preventDefault();
		});
		const onSelect = vi.fn<(value: string) => void>();
		render(
			<Command.Root>
				<Command.Input />
				<Command.List>
					<Command.Item asChild onSelect={onSelect} value="/docs">
						<a href="/docs" onClick={onClick}>
							Docs
						</a>
					</Command.Item>
				</Command.List>
			</Command.Root>,
		);

		await user.type(input(), "{Enter}");

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenLastCalledWith("/docs");
		expect(onClick).toHaveBeenCalledTimes(0);
	});
});

describe("Command.Root value", () => {
	test("defaultValue makes its item active on mount", () => {
		render(<Palette defaultValue="Profile" />);

		expect(active()).toHaveTextContent("Profile");
		expect(screen.getByLabelText("active")).toHaveTextContent("Profile");
	});

	test("onValueChange reports each new active item", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		render(<Palette onValueChange={onValueChange} />);

		await user.type(input(), "{ArrowDown}");

		expect(onValueChange).toHaveBeenLastCalledWith("Search Emoji");
	});

	test("a controlled value activates its item", () => {
		const { rerender } = render(<Palette value="Calendar" />);

		rerender(<Palette value="Billing" />);

		expect(active()).toHaveTextContent("Billing");
	});

	test.for(["Nothing", ""])(
		"a controlled value %j with no item leaves no item active, so Enter selects nothing",
		async (value) => {
			const user = userEvent.setup();
			const onSelect = vi.fn<(value: string) => void>();
			const onValueChange = vi.fn<(value: string) => void>();
			const { rerender } = render(
				<Palette value="Billing" onValueChange={onValueChange} onSelect={onSelect} />,
			);

			rerender(<Palette value={value} onValueChange={onValueChange} onSelect={onSelect} />);
			await user.type(input(), "{Enter}");

			expect(active()).toBeNull();
			expect(onSelect).not.toHaveBeenCalled();
			expect(onValueChange).not.toHaveBeenCalled();
		},
	);
});
