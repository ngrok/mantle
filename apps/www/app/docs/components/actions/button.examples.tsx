import { Button, ButtonGroup, IconButton } from "@ngrok/mantle/button";
import { Field } from "@ngrok/mantle/field";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CopyIcon } from "@phosphor-icons/react/Copy";
import { FireIcon } from "@phosphor-icons/react/Fire";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { TextBIcon } from "@phosphor-icons/react/TextB";
import { TextItalicIcon } from "@phosphor-icons/react/TextItalic";
import { TextUnderlineIcon } from "@phosphor-icons/react/TextUnderline";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

export const copyPage = () => {};

/** The first example on the Button docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex flex-col items-center gap-6">
			<Field.Set className="w-auto items-center">
				<Field.Legend className="w-full text-center">Neutral</Field.Legend>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button appearance="ghost" intent="neutral">
						Ghost
					</Button>
					<Button appearance="filled" intent="neutral">
						Filled
					</Button>
					<Button appearance="outlined" intent="neutral">
						Outlined
					</Button>
					<Button appearance="link" intent="neutral">
						Link
					</Button>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="w-full text-center">Accent</Field.Legend>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button appearance="ghost" intent="accent">
						Ghost
					</Button>
					<Button appearance="filled" intent="accent">
						Filled
					</Button>
					<Button appearance="outlined" intent="accent">
						Outlined
					</Button>
					<Button appearance="link" intent="accent">
						Link
					</Button>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="w-full text-center">Danger</Field.Legend>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button appearance="ghost" intent="danger">
						Ghost
					</Button>
					<Button appearance="filled" intent="danger">
						Filled
					</Button>
					<Button appearance="outlined" intent="danger">
						Outlined
					</Button>
					<Button appearance="link" intent="danger">
						Link
					</Button>
				</div>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "Size" example on the Button docs page. */
export function SizeExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button appearance="outlined" intent="neutral" size="xs">
					Extra small
				</Button>
				<Button appearance="outlined" intent="neutral" size="sm">
					Small
				</Button>
				<Button appearance="outlined" intent="neutral" size="md">
					Medium
				</Button>
				<Button appearance="outlined" intent="neutral" size="lg">
					Large
				</Button>
				<Button appearance="outlined" intent="neutral" size="xl">
					Extra large
				</Button>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button appearance="outlined" intent="neutral" size="xs" icon={<FireIcon weight="fill" />}>
					Extra small
				</Button>
				<Button appearance="outlined" intent="neutral" size="sm" icon={<FireIcon weight="fill" />}>
					Small
				</Button>
				<Button appearance="outlined" intent="neutral" size="md" icon={<FireIcon weight="fill" />}>
					Medium
				</Button>
				<Button appearance="outlined" intent="neutral" size="lg" icon={<FireIcon weight="fill" />}>
					Large
				</Button>
				<Button appearance="outlined" intent="neutral" size="xl" icon={<FireIcon weight="fill" />}>
					Extra large
				</Button>
			</div>
		</PreviewCanvas>
	);
}

/** The "Icon and positioning" example on the Button docs page. */
export function IconAndPositioningExample() {
	return (
		<PreviewCanvas>
			<div className="flex items-center gap-2">
				<Button appearance="outlined" intent="neutral" icon={<FireIcon weight="fill" />}>
					Icon start
				</Button>
				<Button
					appearance="outlined"
					intent="neutral"
					icon={<FireIcon weight="fill" />}
					iconPlacement="end"
				>
					Icon end
				</Button>
			</div>
		</PreviewCanvas>
	);
}

/** The "An icon-only Button" example on the Button docs page. */
export function AnIconOnlyButtonExample() {
	return (
		<PreviewCanvas>
			<IconButton
				appearance="outlined"
				intent="neutral"
				icon={<CopyIcon />}
				label="Copy page"
				onClick={copyPage}
			/>
		</PreviewCanvas>
	);
}

/** The "An icon as a child" example on the Button docs page. */
export function AnIconAsAChildExample() {
	return (
		<PreviewCanvas>
			<Button appearance="filled" intent="neutral" icon={<PlusIcon />}>
				Create endpoint
			</Button>
		</PreviewCanvas>
	);
}

/** The "isLoading" example on the Button docs page. */
export function IsloadingExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<Field.Set className="w-auto items-center">
				<Field.Legend className="w-full text-center">Idle</Field.Legend>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button appearance="outlined" intent="neutral">
						No Icon + Idle
					</Button>
					<Button appearance="outlined" intent="neutral" icon={<FireIcon weight="fill" />}>
						Icon Start + Idle
					</Button>
					<Button
						appearance="outlined"
						intent="neutral"
						icon={<FireIcon weight="fill" />}
						iconPlacement="end"
					>
						Icon End + Idle
					</Button>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="w-full text-center">isLoading</Field.Legend>
				<div className="flex flex-wrap items-center justify-center gap-2">
					<Button appearance="outlined" intent="neutral" isLoading>
						No Icon + isLoading
					</Button>
					<Button
						appearance="outlined"
						intent="neutral"
						icon={<FireIcon weight="fill" />}
						isLoading
					>
						Icon Start + isLoading
					</Button>
					<Button
						appearance="outlined"
						intent="neutral"
						icon={<FireIcon weight="fill" />}
						iconPlacement="end"
						isLoading
					>
						Icon End + isLoading
					</Button>
				</div>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "The label slot" example on the Button docs page. */
export function TheLabelSlotExample() {
	return (
		<PreviewCanvas>
			<Button appearance="outlined" intent="neutral" icon={<PlusIcon />}>
				<span>Create endpoint</span>
				<CaretDownIcon />
			</Button>
		</PreviewCanvas>
	);
}

/** The "A truncated label" example on the Button docs page. */
export function ATruncatedLabelExample() {
	return (
		<PreviewCanvas>
			<Button
				appearance="outlined"
				intent="neutral"
				className="max-w-48 min-w-0 justify-start"
				icon={<PlusIcon />}
			>
				<span className="min-w-0 flex-1 truncate text-left">
					A label far too long for the width of this button
				</span>
				<CaretDownIcon />
			</Button>
		</PreviewCanvas>
	);
}

/** The "Button group" example on the Button docs page. */
export function ButtonGroupExample() {
	return (
		<PreviewCanvas>
			<ButtonGroup appearance="panel">
				<IconButton appearance="ghost" intent="neutral" icon={<TextBIcon />} label="Bold" />
				<IconButton appearance="ghost" intent="neutral" icon={<TextItalicIcon />} label="Italic" />
				<IconButton
					appearance="ghost"
					intent="neutral"
					icon={<TextUnderlineIcon />}
					label="Underline"
				/>
			</ButtonGroup>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Button docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Button appearance="filled" intent="neutral" icon={<FireIcon weight="fill" />} asChild>
				<Link to={href("/base/colors")} target="_top">
					See our colors!
				</Link>
			</Button>
		</PreviewCanvas>
	);
}
