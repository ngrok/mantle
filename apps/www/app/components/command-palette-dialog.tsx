import { Command } from "@ngrok/mantle/command";
import type { ResolvedTheme } from "@ngrok/mantle/theme";
import { useAppliedTheme, useTheme } from "@ngrok/mantle/theme";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ArrowSquareOut";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { MoonIcon } from "@phosphor-icons/react/Moon";
import { SunIcon } from "@phosphor-icons/react/Sun";
import type { PropsWithChildren, ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { PreviewBadge } from "~/components/badges";
import type { PaletteCommand } from "~/components/command-palette-search";
import {
	buildPaletteCommands,
	groupPaletteCommands,
	previewComponentsGroup,
	searchPaletteCommands,
} from "~/components/command-palette-search";
import { useMantleVersion } from "~/components/mantle-version-provider";

function ItemName({ children }: PropsWithChildren) {
	return (
		<span className="flex items-start sm:items-center gap-x-2 gap-y-1 flex-col sm:flex-row">
			{children}
		</span>
	);
}

/** The leading icon for each theme-switching command. */
const themeIcons: Record<ResolvedTheme, ReactNode> = {
	light: <SunIcon />,
	dark: <MoonIcon />,
};

/**
 * Renders one palette command as a `Command.Item`, switching on its kind:
 * internal routes render an intent-prefetched `Link` (keyboard selection
 * mirrors the click), external links open in a new tab on selection, and
 * theme commands apply their theme and show a check on the applied theme.
 *
 * @example
 * ```tsx
 * <PaletteCommandItem command={command} onDone={() => setOpen(false)} />
 * ```
 */
function PaletteCommandItem({
	command,
	showPreviewBadge = false,
	onDone,
}: {
	/** The palette command to render. */
	command: PaletteCommand;
	/**
	 * Show the preview badge inline on preview-component commands — for search
	 * results, where the badged group heading is not visible.
	 */
	showPreviewBadge?: boolean;
	/** Called after the command's action runs — closes the palette. */
	onDone: () => void;
}) {
	const navigate = useNavigate();
	const [, setTheme] = useTheme();
	const appliedTheme = useAppliedTheme();

	switch (command.kind) {
		case "route":
			return (
				<Command.Item
					value={command.id}
					onSelect={() => {
						void navigate(command.to);
						onDone();
					}}
					asChild
				>
					<Link
						to={command.to}
						prefetch="intent"
						className="flex items-center gap-2 justify-between"
					>
						<ItemName>
							{command.title}
							{command.subtitle != null && (
								<span className="text-muted text-xs">{command.subtitle}</span>
							)}
							{showPreviewBadge && command.preview && <PreviewBadge />}
						</ItemName>
						<ArrowRightIcon />
					</Link>
				</Command.Item>
			);
		case "external":
			return (
				<Command.Item
					value={command.id}
					className="justify-between"
					onSelect={() => {
						window.open(command.href, "_blank", "noopener");
						onDone();
					}}
				>
					<ItemName>
						{command.title}
						{command.subtitle != null && (
							<span className="text-muted text-xs font-mono">{command.subtitle}</span>
						)}
					</ItemName>
					<ArrowSquareOutIcon />
				</Command.Item>
			);
		case "theme":
			return (
				<Command.Item
					value={command.id}
					onSelect={() => {
						setTheme(command.theme);
						onDone();
					}}
				>
					{themeIcons[command.theme]}
					{command.title}
					{appliedTheme === command.theme && <CheckIcon />}
				</Command.Item>
			);
	}
}

/**
 * The command dialog of the docs site search palette. Browsing (empty query)
 * lists every command in its group; typing switches to a flat,
 * relevance-ranked result list. Filtering and ranking are owned here (see
 * `command-palette-search.ts`) with cmdk's built-in filtering disabled, so
 * result order is exactly the ranked order. `CommandPalette` loads this
 * module at the first open.
 *
 * @example
 * ```tsx
 * <CommandPaletteDialog open={open} onOpenChange={setOpen} />
 * ```
 */
export function CommandPaletteDialog({
	open,
	onOpenChange,
}: {
	/** Whether the dialog is open. */
	open: boolean;
	/** Called when the dialog asks to open or close. */
	onOpenChange: (open: boolean) => void;
}) {
	const mantleVersion = useMantleVersion();
	const [query, setQuery] = useState("");

	const commands = useMemo(() => buildPaletteCommands(mantleVersion), [mantleVersion]);
	const groups = useMemo(() => groupPaletteCommands(commands), [commands]);
	const results = useMemo(() => searchPaletteCommands(commands, query), [commands, query]);
	const isSearching = query.trim().length > 0;

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setQuery("");
		}
	};
	const closePalette = () => {
		handleOpenChange(false);
	};

	// keyboardShortcut={false}: `CommandPalette` binds mod+k itself, and this dialog
	// controls its own query, so mantle's built-in shortcut would be a second owner
	// of the same chord.
	return (
		<Command.DialogRoot keyboardShortcut={false} open={open} onOpenChange={handleOpenChange}>
			<Command.DialogContent shouldFilter={false}>
				<Command.Input placeholder="Search Mantle..." value={query} onValueChange={setQuery} />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					{isSearching ? (
						<Command.Group>
							{results.map((command) => (
								<PaletteCommandItem
									key={command.id}
									command={command}
									showPreviewBadge
									onDone={closePalette}
								/>
							))}
						</Command.Group>
					) : (
						groups.map(({ group, commands: groupCommands }, index) => (
							<Fragment key={group}>
								{/* alwaysRender: this browse branch already owns separator
								    visibility; without it cmdk hides separators as soon as its
								    search state is non-empty, e.g. a whitespace-only query */}
								{index > 0 && <Command.Separator alwaysRender />}
								<Command.Group
									heading={
										group === previewComponentsGroup ? (
											<span className="flex items-center gap-2">
												{group} <PreviewBadge />
											</span>
										) : (
											group
										)
									}
								>
									{groupCommands.map((command) => (
										<PaletteCommandItem key={command.id} command={command} onDone={closePalette} />
									))}
								</Command.Group>
							</Fragment>
						))
					)}
				</Command.List>
			</Command.DialogContent>
		</Command.DialogRoot>
	);
}
