import { Checkbox } from "@ngrok/mantle/checkbox";
import { Choice } from "@ngrok/mantle/choice";
import { Field } from "@ngrok/mantle/field";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Choice docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<Choice.Root name="notify-email">
					<Choice.Indicator>
						<Checkbox defaultChecked />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description>Get notified by email when a deploy finishes.</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Inside a Field" example on the Choice docs page. */
export function InsideAFieldExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<Field.Item name="notify">
					<Field.Label>Notifications</Field.Label>
					<Field.Control>
						<Choice.Root>
							<Choice.Indicator>
								<Checkbox />
							</Choice.Indicator>
							<Choice.Content>
								<Choice.Label>Email</Choice.Label>
								<Choice.Description>Sent to your primary address.</Choice.Description>
							</Choice.Content>
						</Choice.Root>
					</Field.Control>
					<Field.Description>Choose how we reach you.</Field.Description>
				</Field.Item>
			</div>
		</PreviewCanvas>
	);
}

/** The "Choice.Label vs Choice.Title" example on the Choice docs page. */
export function ChoiceLabelVsChoiceTitleExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				{/* oxlint-disable-next-line jsx-a11y/label-has-associated-control -- the text is in Choice.Title, which the rule cannot see through */}
				<label
					htmlFor="choice-onboarding-key"
					className="border-form flex cursor-pointer rounded-md border p-3"
				>
					<Choice.Root id="choice-onboarding-key">
						<Choice.Indicator>
							<Checkbox defaultChecked />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Onboarding Key</Choice.Title>
							<Choice.Description translate="no">ng-3FaThZL***8xiA</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</label>
			</div>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Choice docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<div className="w-full max-w-md">
				<Choice.Root name="notify-rich">
					<Choice.Indicator>
						<Checkbox defaultChecked />
					</Choice.Indicator>
					<Choice.Content>
						<Choice.Label>Email</Choice.Label>
						<Choice.Description asChild>
							<div>
								Supports <a href="/docs">rich content</a> when rendered as a div.
							</div>
						</Choice.Description>
					</Choice.Content>
				</Choice.Root>
			</div>
		</PreviewCanvas>
	);
}
