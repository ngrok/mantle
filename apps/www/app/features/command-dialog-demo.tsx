"use client";

import { Button } from "@ngrok/mantle/button";
import { Command, MetaKey } from "@ngrok/mantle/command";
import {
	CalculatorIcon,
	CalendarIcon,
	CreditCardIcon,
	GearIcon,
	SmileyIcon,
	UserIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook that listens for a keyboard shortcut with Cmd/Ctrl modifier.
 */
function useHotkey(key: string, callback: () => void) {
	useEffect(() => {
		const keydown = (event: KeyboardEvent) => {
			if (event.key === key && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				callback();
			}
		};
		document.addEventListener("keydown", keydown);
		return () => document.removeEventListener("keydown", keydown);
	}, [key, callback]);
}

/**
 * Demo component for the Command.Dialog, with a hotkey to toggle it open.
 */
export function CommandDialogDemo() {
	const [open, setOpen] = useState(false);
	const toggle = useCallback(() => setOpen((prev) => !prev), []);
	useHotkey("j", toggle);
	return (
		<>
			<p className="text-muted-foreground text-sm gap-2 flex items-center">
				Press{" "}
				<kbd className="bg-muted text-muted pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
					<span className="text-xs">
						<MetaKey />
					</span>
					J
				</kbd>
				or
				<Button type="button" appearance="outlined" priority="neutral" onClick={toggle}>
					Open Command Dialog
				</Button>
			</p>
			<Command.Dialog.Root open={open} onOpenChange={setOpen}>
				<Command.Dialog.Content>
					<Command.Input placeholder="Type a command or search..." />
					<Command.List>
						<Command.Empty>No results found.</Command.Empty>
						<Command.Group heading="Suggestions">
							<Command.Item>
								<CalendarIcon />
								<span>Calendar</span>
							</Command.Item>
							<Command.Item>
								<SmileyIcon />
								<span>Search Emoji</span>
							</Command.Item>
							<Command.Item>
								<CalculatorIcon />
								<span>Calculator</span>
							</Command.Item>
						</Command.Group>
						<Command.Separator />
						<Command.Group heading="Settings">
							<Command.Item>
								<UserIcon />
								<span>Profile</span>
								<Command.Shortcut>
									<MetaKey /> P
								</Command.Shortcut>
							</Command.Item>
							<Command.Item>
								<CreditCardIcon />
								<span>Billing</span>
								<Command.Shortcut>
									<MetaKey /> B
								</Command.Shortcut>
							</Command.Item>
							<Command.Item>
								<GearIcon />
								<span>Settings</span>
								<Command.Shortcut>
									<MetaKey /> S
								</Command.Shortcut>
							</Command.Item>
						</Command.Group>
					</Command.List>
				</Command.Dialog.Content>
			</Command.Dialog.Root>
		</>
	);
}
