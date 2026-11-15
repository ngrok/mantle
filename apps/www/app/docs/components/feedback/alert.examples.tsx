import { Alert } from "@ngrok/mantle/alert";
import { Card } from "@ngrok/mantle/card";
import { $cssProperties } from "@ngrok/mantle/types";
import { ShrimpIcon } from "@phosphor-icons/react/Shrimp";

import { DismissibleAlertDemo, DynamicAlertDemo } from "~/features/alert-demos";
import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Alert docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="info">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Maintenance window</Alert.Title>
					<Alert.Description>Service may be briefly unavailable.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Alert docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="info">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title asChild>
						<h2>Maintenance window</h2>
					</Alert.Title>
					<Alert.Description asChild>
						<p>Service may be briefly unavailable.</p>
					</Alert.Description>
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Intents" example on the Alert docs page. */
export function IntentsExample() {
	return (
		<PreviewCanvas className="flex-col gap-2">
			<Alert.Root intent="danger">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Danger</Alert.Title>
					<Alert.Description>This is a danger Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
			<Alert.Root intent="info">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Info</Alert.Title>
					<Alert.Description>This is an info Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
			<Alert.Root intent="important">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Important</Alert.Title>
					<Alert.Description>This is an important Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
			<Alert.Root intent="success">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Success</Alert.Title>
					<Alert.Description>This is a success Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
			<Alert.Root intent="warning">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Warning</Alert.Title>
					<Alert.Description>This is a warning Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Custom icon" example on the Alert docs page. */
export function CustomIconExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="danger">
				<Alert.Icon svg={<ShrimpIcon />} />
				<Alert.Content>
					<Alert.Title>Danger w/ custom icon</Alert.Title>
					<Alert.Description>This is a danger Alert.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Layouts" example on the Alert docs page. */
export function LayoutsExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<div className="w-full max-w-screen-sm space-y-2">
				<Alert.Root intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Danger Will Robinson</Alert.Title>
						<Alert.DismissIconButton />
						<Alert.Description>
							Cupidatat ullamco commodo laborum consectetur ut mollit et nostrud amet elit ut Lorem
							culpa.
						</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			</div>
			<div className="w-full max-w-screen-sm space-y-2">
				<Alert.Root intent="danger">
					<Alert.Content>
						<Alert.Title>Danger Will Robinson</Alert.Title>
						<Alert.Description>
							Cupidatat ullamco commodo laborum consectetur ut mollit et nostrud amet elit ut Lorem
							culpa.
						</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			</div>
			<div className="w-full max-w-screen-sm space-y-2">
				<Alert.Root intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>Danger Will Robinson</Alert.Title>
					</Alert.Content>
				</Alert.Root>
			</div>
			<div className="w-full max-w-screen-sm space-y-2">
				<Alert.Root intent="danger">
					<Alert.Content>
						<Alert.Title>Danger Will Robinson</Alert.Title>
						<Alert.DismissIconButton />
					</Alert.Content>
				</Alert.Root>
			</div>
		</PreviewCanvas>
	);
}

/** The "Banners" example on the Alert docs page. */
export function BannersExample() {
	return (
		<PreviewCanvas>
			<div className="border-card min-h-56 space-y-4 border">
				<Alert.Root intent="info" appearance="banner">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>This is an info Alert as a page banner</Alert.Title>
					</Alert.Content>
				</Alert.Root>
				<div className="px-4">
					<Card.Root className="mx-auto max-w-screen-sm">
						<Card.Body>
							<p className="my-4">Laboris commodo Lorem anim consequat ut dolore proident.</p>
						</Card.Body>
					</Card.Root>
				</div>
			</div>
		</PreviewCanvas>
	);
}

/** The "Dismissal" example on the Alert docs page. */
export function DismissalExample() {
	return (
		<PreviewCanvas className="w-full">
			<DismissibleAlertDemo />
		</PreviewCanvas>
	);
}

/** The "Expand button" example on the Alert docs page. */
export function ExpandButtonExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="warning">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Your workspace is approaching its monthly usage limit</Alert.Title>
					<Alert.ExpandButton count={2} expanded={false} />
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Dismiss and expand" example on the Alert docs page. */
export function DismissAndExpandExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="warning">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Your workspace is approaching its monthly usage limit</Alert.Title>
					<Alert.ExpandButton count={2} expanded={false} />
					<Alert.DismissIconButton />
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Trailing control colors" example on the Alert docs page. */
export function TrailingControlColorsExample() {
	return (
		<PreviewCanvas>
			<Alert.Root
				intent="warning"
				style={$cssProperties({
					"--alert-control-color": "var(--color-neutral-700)",
					"--alert-control-hover-color": "var(--color-neutral-900)",
					"--alert-control-hover-bg":
						"color-mix(in oklab, var(--color-neutral-500) 10%, transparent)",
				})}
			>
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Usage limit approaching</Alert.Title>
					<Alert.ExpandButton count={2} expanded={false} />
					<Alert.DismissIconButton />
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Custom dismiss icon" example on the Alert docs page. */
export function CustomDismissIconExample() {
	return (
		<PreviewCanvas>
			<Alert.Root intent="warning">
				<Alert.Icon />
				<Alert.Content>
					<Alert.Title>Custom Dismiss Icon</Alert.Title>
					<Alert.DismissIconButton icon={<ShrimpIcon />} />
					<Alert.Description>This dismiss button uses a custom icon.</Alert.Description>
				</Alert.Content>
			</Alert.Root>
		</PreviewCanvas>
	);
}

/** The "Announcing a dynamic alert" example on the Alert docs page. */
export function AnnouncingADynamicAlertExample() {
	return (
		<PreviewCanvas className="w-full">
			<DynamicAlertDemo />
		</PreviewCanvas>
	);
}
