import { IconButton } from "@ngrok/mantle/button";
import { Field } from "@ngrok/mantle/field";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { Link, href } from "react-router";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Icon Button docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="flex items-center justify-center gap-2">
			<IconButton
				appearance="ghost"
				intent="neutral"
				label="prestige worldwide"
				icon={<GlobeIcon />}
			/>
			<IconButton
				appearance="filled"
				intent="neutral"
				label="prestige worldwide"
				icon={<GlobeIcon />}
			/>
			<IconButton
				appearance="outlined"
				intent="neutral"
				label="prestige worldwide"
				icon={<GlobeIcon />}
			/>
		</PreviewCanvas>
	);
}

/** The "Size" example on the Icon Button docs page. */
export function SizeExample() {
	return (
		<PreviewCanvas className="min-h-160 flex flex-wrap gap-6">
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size 2xs</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						size="2xs"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						size="2xs"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						size="2xs"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size xs</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						size="xs"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						size="xs"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						size="xs"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size sm</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						size="sm"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						size="sm"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						size="sm"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size md</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size lg</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						size="lg"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						size="lg"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						size="lg"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Size xl</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						size="xl"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="filled"
						intent="neutral"
						label="prestige worldwide"
						size="xl"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						size="xl"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">Disabled</Field.Legend>
				<div className="flex items-center gap-2">
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<IconButton
								disabled
								appearance="ghost"
								intent="neutral"
								label="prestige worldwide"
								icon={<GlobeIcon />}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content>Tooltips work on disabled buttons!</Tooltip.Content>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<IconButton
								disabled
								appearance="filled"
								intent="neutral"
								label="prestige worldwide"
								icon={<GlobeIcon />}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content>Tooltips work on disabled buttons!</Tooltip.Content>
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger asChild>
							<IconButton
								disabled
								appearance="outlined"
								intent="neutral"
								label="prestige worldwide"
								icon={<GlobeIcon />}
							/>
						</Tooltip.Trigger>
						<Tooltip.Content>Tooltips work on disabled buttons!</Tooltip.Content>
					</Tooltip.Root>
				</div>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "isLoading" example on the Icon Button docs page. */
export function IsloadingExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">idle</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
			<Field.Set className="w-auto items-center">
				<Field.Legend className="mx-auto">isLoading</Field.Legend>
				<div className="flex items-center gap-2">
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="prestige worldwide"
						isLoading
						icon={<GlobeIcon />}
					/>
					<IconButton
						appearance="outlined"
						intent="neutral"
						label="prestige worldwide"
						isLoading
						icon={<GlobeIcon />}
					/>
				</div>
			</Field.Set>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Icon Button docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<IconButton
				appearance="outlined"
				intent="neutral"
				asChild
				label="prestige worldwide"
				icon={<GlobeIcon />}
			>
				<Link to={href("/base/colors")} target="_top" />
			</IconButton>
		</PreviewCanvas>
	);
}
