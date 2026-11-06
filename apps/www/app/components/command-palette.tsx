import { Button, IconButton } from "@ngrok/mantle/button";
import { MetaKey } from "@ngrok/mantle/command";
import { Kbd } from "@ngrok/mantle/kbd";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { lazy, Suspense, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const loadDialog = () => import("~/components/command-palette-dialog");

/** Starts the dialog download on intent, so the first open waits less. */
const preloadDialog = () => {
	void loadDialog();
};

const CommandPaletteDialog = lazy(() =>
	loadDialog().then((module) => ({ default: module.CommandPaletteDialog })),
);

/**
 * The docs site search palette (⌘K): search triggers for the header plus the
 * command dialog. The dialog, with cmdk and the search code, loads at the
 * first open, or when a pointer or focus reaches a trigger, so a page ships
 * none of it until then.
 *
 * @example
 * ```tsx
 * <CommandPalette />
 * ```
 */
export function CommandPalette() {
	const [open, setOpen] = useState(false);
	// Why: the dialog stays mounted after the first open, so its close animation runs.
	const [opened, setOpened] = useState(false);
	const openPalette = () => {
		setOpened(true);
		setOpen(true);
	};
	// preventDefault: browsers bind mod+k themselves (Firefox focuses the
	// search bar), so the shortcut must claim the event to open only our palette
	useHotkeys("mod+k", openPalette, { preventDefault: true });

	return (
		<>
			<IconButton
				appearance="ghost"
				intent="neutral"
				className="flex md:hidden"
				icon={<MagnifyingGlassIcon />}
				label="Search Mantle"
				onClick={openPalette}
				onFocus={preloadDialog}
				onPointerEnter={preloadDialog}
				size="md"
				type="button"
			/>
			<Button
				appearance="outlined"
				className="hidden md:flex"
				icon={<MagnifyingGlassIcon />}
				onClick={openPalette}
				onFocus={preloadDialog}
				onPointerEnter={preloadDialog}
				intent="neutral"
				type="button"
			>
				<span className="sr-only">Search Mantle</span>
				Search
				<span className="inline-flex gap-1 items-center pointer-events-none select-none">
					<MetaKey />
					<Kbd>K</Kbd>
				</span>
			</Button>
			{opened && (
				<Suspense fallback={null}>
					<CommandPaletteDialog open={open} onOpenChange={setOpen} />
				</Suspense>
			)}
		</>
	);
}
