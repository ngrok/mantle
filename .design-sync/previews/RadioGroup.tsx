import { Field, RadioGroup } from "@ngrok/mantle";

export const WithFieldSet = () => (
	<Field.Set>
		<Field.Legend>Density</Field.Legend>
		<RadioGroup.Root name="density" defaultValue="compact">
			<RadioGroup.Item value="default" id="density-default">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent asChild>
					<label htmlFor="density-default">Default</label>
				</RadioGroup.ItemContent>
			</RadioGroup.Item>
			<RadioGroup.Item value="comfortable" id="density-comfortable" disabled>
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent asChild>
					<label htmlFor="density-comfortable">Comfortable</label>
				</RadioGroup.ItemContent>
			</RadioGroup.Item>
			<RadioGroup.Item value="compact" id="density-compact">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent asChild>
					<label htmlFor="density-compact">Compact</label>
				</RadioGroup.ItemContent>
			</RadioGroup.Item>
		</RadioGroup.Root>
		<Field.Description>Choose the row spacing for tables.</Field.Description>
	</Field.Set>
);

export const ButtonGroup = () => (
	<RadioGroup.ButtonGroup className="w-full max-w-md" defaultValue="production">
		<RadioGroup.Button value="development">Development</RadioGroup.Button>
		<RadioGroup.Button value="staging" disabled>
			Staging
		</RadioGroup.Button>
		<RadioGroup.Button value="production">Production</RadioGroup.Button>
	</RadioGroup.ButtonGroup>
);

export const List = () => (
	<RadioGroup.List className="w-full max-w-md" defaultValue="mixed">
		<RadioGroup.ListItem value="off" id="sso-off">
			<RadioGroup.Indicator />
			<RadioGroup.ItemContent>
				<label className="text-strong font-medium" htmlFor="sso-off">
					Off
				</label>
				<p className="text-body">Members log in with any method.</p>
			</RadioGroup.ItemContent>
		</RadioGroup.ListItem>
		<RadioGroup.ListItem value="mixed" id="sso-mixed">
			<RadioGroup.Indicator />
			<RadioGroup.ItemContent>
				<label className="text-strong font-medium" htmlFor="sso-mixed">
					Mixed
				</label>
				<p className="text-body">
					Only new members must use SSO. Existing members keep other methods.
				</p>
			</RadioGroup.ItemContent>
		</RadioGroup.ListItem>
		<RadioGroup.ListItem value="strict" id="sso-strict" disabled>
			<RadioGroup.Indicator />
			<RadioGroup.ItemContent>
				<label className="text-strong font-medium" htmlFor="sso-strict">
					Strict
				</label>
				<p className="text-body">All members must log in with SSO.</p>
			</RadioGroup.ItemContent>
		</RadioGroup.ListItem>
	</RadioGroup.List>
);

const plans = [
	{ value: "free", title: "Free", description: "1 static domain", price: "$0 / mo" },
	{
		value: "personal",
		title: "Personal",
		description: "3 endpoints, custom domains",
		price: "$8 / mo",
	},
	{
		value: "pro",
		title: "Pro",
		description: "Traffic Policy and IP restrictions",
		price: "$20 / mo",
	},
] as const;

export const Cards = () => (
	<RadioGroup.Root className="grid w-full max-w-2xl grid-cols-3 gap-4" defaultValue="personal">
		{plans.map((plan) => (
			<RadioGroup.Card
				key={plan.value}
				className="flex"
				value={plan.value}
				id={`plan-${plan.value}`}
			>
				<div className="flex-1">
					<label htmlFor={`plan-${plan.value}`} className="text-strong block text-sm font-medium">
						{plan.title}
					</label>
					<p className="text-muted mt-1 text-sm">{plan.description}</p>
					<p className="mt-6 text-sm font-medium">{plan.price}</p>
				</div>
				<RadioGroup.Indicator />
			</RadioGroup.Card>
		))}
	</RadioGroup.Root>
);
