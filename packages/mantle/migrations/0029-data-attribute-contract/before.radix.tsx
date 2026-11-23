import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Icon } from "@ngrok/mantle/icon";
import { Tabs } from "@ngrok/mantle/tabs";

// A file that imports Radix keeps matching Radix's data-state through the bracket form.
export function UseCaseTabs() {
	return (
		<Tabs.Root defaultValue="a">
			<TabsPrimitive.Trigger
				value="a"
				className="group data-state-active:bg-card-hover data-state-inactive:opacity-60"
			>
				<Icon className="size-6 group-data-state-active:text-accent-600 data-side-top:mb-1" />
			</TabsPrimitive.Trigger>
		</Tabs.Root>
	);
}
