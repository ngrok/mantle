import { Button, IconButton } from "@ngrok/mantle/button";
import { Command, MetaKey } from "@ngrok/mantle/command";
import { Kbd } from "@ngrok/mantle/kbd";
import type { Theme } from "@ngrok/mantle/theme";
import { useTheme } from "@ngrok/mantle/theme";
import {
	ArrowRightIcon,
	ArrowSquareOutIcon,
	CheckIcon,
	MagnifyingGlassIcon,
	MonitorIcon,
	MoonIcon,
	SunIcon,
} from "@phosphor-icons/react";
import type { PropsWithChildren, ReactNode } from "react";
import { Fragment, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
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
const themeIcons: Record<Theme, ReactNode> = {
	system: <MonitorIcon />,
	light: <SunIcon />,
	dark: <MoonIcon />,
	"light-high-contrast": <SunIcon weight="fill" />,
	"dark-high-contrast": <MoonIcon weight="fill" />,
};

/**
 * Renders one palette command as a `Command.Item`, switching on its kind:
 * internal routes render an intent-prefetched `Link` (keyboard selection
 * mirrors the click), external links open in a new tab on selection, and
 * theme commands apply their theme and show a check when active.
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
	const [currentTheme, setTheme] = useTheme();

	switch (command.kind) {
		case "route":
			return (
				<Command.Item
					value={command.id}
					onSelect={() => {
						navigate(command.to);
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
					{currentTheme === command.theme ? <CheckIcon /> : null}
				</Command.Item>
			);
	}
}

/**
 * The docs site search palette (⌘K): search triggers for the header plus the
 * command dialog. Browsing (empty query) lists every command in its group;
 * typing switches to a flat, relevance-ranked result list. Filtering and
 * ranking are owned here (see `command-palette-search.ts`) with cmdk's
 * built-in filtering disabled, so result order is exactly the ranked order.
 *
 * @example
 * ```tsx
 * <CommandPalette />
 * ```
 */
export function CommandPalette() {
	const mantleVersion = useMantleVersion();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	// preventDefault: browsers bind mod+k themselves (Firefox focuses the
	// search bar), so the shortcut must claim the event to open only our palette
	useHotkeys("mod+k", () => setOpen(true), { preventDefault: true }, [setOpen]);

	const commands = useMemo(() => buildPaletteCommands(mantleVersion), [mantleVersion]);
	const groups = useMemo(() => groupPaletteCommands(commands), [commands]);
	const results = useMemo(() => searchPaletteCommands(commands, query), [commands, query]);
	const isSearching = query.trim().length > 0;

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			setQuery("");
		}
	};
	const closePalette = () => {
		handleOpenChange(false);
	};

	return (
		<>
			<IconButton
				appearance="ghost"
				intent="neutral"
				className="flex md:hidden"
				icon={<MagnifyingGlassIcon />}
				label="Search Mantle"
				onClick={() => setOpen(true)}
				size="md"
				type="button"
			/>
			<Button
				appearance="outlined"
				className="hidden md:flex"
				icon={<MagnifyingGlassIcon />}
				onClick={() => setOpen(true)}
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
			<Command.DialogRoot open={open} onOpenChange={handleOpenChange}>
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
									{index > 0 ? <Command.Separator alwaysRender /> : null}
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
											<PaletteCommandItem
												key={command.id}
												command={command}
												onDone={closePalette}
											/>
										))}
									</Command.Group>
								</Fragment>
							))
						)}
					</Command.List>
				</Command.DialogContent>
			</Command.DialogRoot>
		</>
	);
}
