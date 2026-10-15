import { Button, Tooltip, TooltipProvider } from "@ngrok/mantle";

export const PlanFeature = () => (
	<TooltipProvider>
		<Tooltip.Root defaultOpen>
			<Tooltip.Trigger asChild>
				<Button type="button" appearance="outlined" intent="neutral">
					Reserve domain
				</Button>
			</Tooltip.Trigger>
			<Tooltip.Content side="top">
				<p>Custom domains are part of the Pay-as-you-go plan</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</TooltipProvider>
);
