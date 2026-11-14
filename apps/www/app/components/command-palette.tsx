import { Button, IconButton } from "@ngrok/mantle/button";
import { MetaKey } from "@ngrok/mantle/command";
import { Kbd } from "@ngrok/mantle/kbd";
import { Toast, makeToast } from "@ngrok/mantle/toast";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { Component, lazy, startTransition, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const CommandPaletteDialog = lazy(() =>
	import("~/components/command-palette-dialog").then((module) => ({
		default: module.CommandPaletteDialog,
	})),
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
 * command dialog. The dialog, with cmdk and the search code, is a separate
 * chunk. It loads after hydration, so it does not delay the first paint, and
 * it is ready before the first open.
 *
 * @example
 * ```tsx
 * <CommandPalette />
 * ```
 */
export function CommandPalette() {
	const [open, setOpen] = useState(false);
	// Why: mount the closed dialog after hydration. Then the lazy chunk loads
	// before the first open. If the first open suspends, React holds the reveal
	// for up to 300 ms, and ⌘K feels slow.
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		startTransition(() => {
			setMounted(true);
		});
	}, []);
	const openPalette = () => {
		setMounted(true);
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
				size="md"
				type="button"
			/>
			<Button
				appearance="outlined"
				className="hidden md:flex"
				icon={<MagnifyingGlassIcon />}
				onClick={openPalette}
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
			{mounted && (
				<DialogLoadBoundary
					onError={() => {
						setMounted(false);
						// Why: a failed background load stays silent. The toast shows
						// when a person opens the palette, and the cached failure throws again.
						if (!open) {
							return;
						}
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
