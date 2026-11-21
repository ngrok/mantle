import { IconButton } from "@ngrok/mantle/button";
import { Tooltip } from "@ngrok/mantle/tooltip";
import { GlobeIcon } from "@phosphor-icons/react/dist/ssr/Globe";
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
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size 2xs</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size xs</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size sm</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size md</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size lg</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Size xl</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">Disabled</p>
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
			</div>
		</PreviewCanvas>
	);
}

/** The "isLoading" example on the Icon Button docs page. */
export function IsloadingExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<div>
				<p className="mb-2 text-center font-mono text-xs">idle</p>
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
			</div>
			<div>
				<p className="mb-2 text-center font-mono text-xs">isLoading</p>
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
			</div>
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
