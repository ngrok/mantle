import { Button } from "@ngrok/mantle/button";
import { HoverCard } from "@ngrok/mantle/hover-card";
import { Icon } from "@ngrok/mantle/icon";
import { CalendarIcon } from "@phosphor-icons/react/dist/ssr/Calendar";
import { ShrimpIcon } from "@phosphor-icons/react/dist/ssr/Shrimp";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Hover Card docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<HoverCard.Root>
				<HoverCard.Trigger asChild>
					<Button type="button" appearance="link" intent="accent">
						Open hover card
					</Button>
				</HoverCard.Trigger>
				<HoverCard.Content className="w-80">
					<div className="flex justify-between space-x-4">
						<div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-pink-300">
							<Icon svg={<ShrimpIcon />} className="size-12" />
						</div>
						<div className="space-y-1">
							<h4 className="text-sm font-medium">@ngrok/mantle</h4>
							<p className="text-sm">The Design System – created and maintained by @ngrok.</p>
							<div className="flex items-center pt-2">
								<Icon svg={<CalendarIcon />} className="mr-2 h-4 w-4 opacity-70" />{" "}
								<span className="text-muted-foreground text-xs">Joined November 2023</span>
							</div>
						</div>
					</div>
				</HoverCard.Content>
			</HoverCard.Root>
		</PreviewCanvas>
	);
}

/** The "Arrow" example on the Hover Card docs page. */
export function ArrowExample() {
	return (
		<PreviewCanvas className="min-h-160 gap-2">
			<HoverCard.Root>
				<HoverCard.Trigger asChild>
					<Button type="button" appearance="link" intent="accent">
						@ngrok/mantle
					</Button>
				</HoverCard.Trigger>
				<HoverCard.Content className="w-64">
					<HoverCard.Arrow />
					<p className="text-sm">The Design System – created and maintained by @ngrok.</p>
				</HoverCard.Content>
			</HoverCard.Root>
		</PreviewCanvas>
	);
}
