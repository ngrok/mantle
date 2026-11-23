import { Accordion } from "@ngrok/mantle/accordion";
import { Dialog } from "@ngrok/mantle/dialog";
import { Icon } from "@ngrok/mantle/icon";
import { DropdownMenu } from "@ngrok/mantle/dropdown-menu";
import { Popover } from "@ngrok/mantle/popover";
import { Select } from "@ngrok/mantle/select";
import { Switch } from "@ngrok/mantle/switch";
import { Tabs } from "@ngrok/mantle/tabs";
import { cx } from "@ngrok/mantle/cx";
import { expect, test } from "vitest";

// A trigger carries aria-expanded, and a group- variant inside it reads the trigger.
export function Faq() {
	return (
		<Accordion.Root type="single">
			<Accordion.Item value="a">
				<Accordion.Trigger className="py-3 aria-expanded:pb-0 not-aria-expanded:text-muted">
					<Icon className="size-3 group-aria-expanded:rotate-90 motion-reduce:transition-none" />
					Question
				</Accordion.Trigger>
				<Accordion.Content className="data-open:animate-in not-data-open:animate-out">
					Answer
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	);
}

// An asChild trigger element reads aria-expanded; a group- variant on a trigger reads its item.
export function AsChild() {
	return (
		<Accordion.Item value="b" className="group">
			<Accordion.Trigger className="group-data-open:font-medium">B</Accordion.Trigger>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button type="button" className="group aria-expanded:bg-neutral-500/15">
						Account
					</button>
				</DropdownMenu.Trigger>
			</DropdownMenu.Root>
		</Accordion.Item>
	);
}

// Content keys on data-open, exits on not-data-open, and the enums use brackets.
export function Menu() {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger className="hover:text-strong aria-expanded:text-strong">
				Open
			</DropdownMenu.Trigger>
			<DropdownMenu.Content className="data-[side=top]:mb-2 data-[side=bottom]:mt-2 motion-safe:not-data-open:fade-out">
				<DropdownMenu.Item className="data-highlighted:bg-active-menu-item">Copy</DropdownMenu.Item>
				<DropdownMenu.CheckboxItem
					checked="indeterminate"
					className="aria-[checked=mixed]:text-muted"
				>
					Errors
				</DropdownMenu.CheckboxItem>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

// Checked, selected, and named groups.
export function Settings({ invalid }: { invalid: boolean }) {
	return (
		<>
			<Switch className="aria-checked:bg-pink-500! not-aria-checked:bg-gray-200" />
			<Tabs.Root defaultValue="a" orientation="vertical">
				<Tabs.List className="aria-[orientation=vertical]:flex-col">
					<Tabs.Trigger
						value="a"
						className="aria-selected:text-strong not-aria-selected:opacity-60 group/tab"
					>
						<span className="group-aria-selected/tab:font-medium">A</span>
					</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content value="a" className="data-[state~=inactive]:hidden">
					Panel
				</Tabs.Content>
			</Tabs.Root>
			<Select.Item value="a" className="aria-selected:font-bold not-aria-selected:opacity-50">
				Apple
			</Select.Item>
			<input className={cx("border", invalid && "data-[validation=error]:border-danger-600")} />
		</>
	);
}

// A class string outside JSX follows the same map.
export const sheetClassName = `bg-base not-data-open:animate-none data-open:animate-none ${extra}`;

// An element that sets its own data-state keeps matching it through the bracket form.
export function OwnState({ open }: { open: boolean }) {
	return (
		<div
			data-state={open ? "open" : "closed"}
			className="data-[state~=closed]:opacity-0 data-[state~=open]:duration-400 data-[side=top]:mb-2"
		>
			<span
				data-state="open"
				className="group-data-open:rotate-90 hover:data-[state~=closed]:p-1"
			/>
			<Tabs.List data-state="idle" className="aria-[orientation=vertical]:pl-4" />
			<Popover.Content className="not-data-open:opacity-0" />
		</div>
	);
}

// Negative cases: built-in and bracket forms, other words, and other attributes stay as written.
export function Untouched() {
	return (
		<Popover.Root>
			<Popover.Content className="data-open:block data-[state=open]:flex mydata-state-open:p-2 data-state-custom:p-3" />
			<Dialog.Content data-state="open" />
		</Popover.Root>
	);
}

test("presence-only state", () => {
	expect(screen.getByRole("dialog")).toHaveAttribute("data-open");
	expect(screen.getByRole("listbox")).not.toHaveAttribute("data-open");
	expect(nav).toHaveAttribute("data-expanded");
	expect(nav).not.toHaveAttribute("data-expanded");
	// Negative cases: another value, another attribute, and a negated assertion stay.
	expect(panel).toHaveAttribute("data-state", "streaming");
	expect(panel).toHaveAttribute("data-mode", "open");
	expect(panel).not.toHaveAttribute("data-state", "open");
});
