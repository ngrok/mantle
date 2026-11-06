import { Button, IconButton } from "@ngrok/mantle/button";
import { MetaKey } from "@ngrok/mantle/command";
import { Kbd } from "@ngrok/mantle/kbd";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { Component, lazy, Suspense, useState } from "react";
import type { ReactNode } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const loadDialog = () => import("~/components/command-palette-dialog");

/** Starts the dialog download on intent, so the first open waits less. */
const preloadDialog = () => {
	// Why: `DialogLoadBoundary` reports a failed load when the palette opens.
	loadDialog().catch(() => undefined);
};

const CommandPaletteDialog = lazy(() =>
	loadDialog().then((module) => ({ default: module.CommandPaletteDialog })),
);

type DialogLoadBoundaryProps = {
	children: ReactNode;
	/** Called when the dialog chunk fails to load. */
	onError: () => void;
};

/**
 * Catches a failed load of the dialog chunk, such as an old chunk after a
 * deploy, so the docs page stays. Without it, the root `ErrorBoundary`
 * replaces the page.
 */
class DialogLoadBoundary extends Component<DialogLoadBoundaryProps, { failed: boolean }> {
	override state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override componentDidCatch() {
		this.props.onError();
	}

	override render() {
		if (this.state.failed) {
			return null;
		}
		return this.props.children;
	}
}

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
				<DialogLoadBoundary
					onError={() => {
						setOpened(false);
						setOpen(false);
						makeToast(
							<Toast.Root intent="danger">
								<Toast.Icon />
								<Toast.Message>Search failed to load. Reload the page to try again.</Toast.Message>
							</Toast.Root>,
						);
					}}
				>
					<Suspense fallback={null}>
						<CommandPaletteDialog open={open} onOpenChange={setOpen} />
					</Suspense>
				</DialogLoadBoundary>
			)}
		</>
	);
}
