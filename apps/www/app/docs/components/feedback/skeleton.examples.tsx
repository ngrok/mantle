import { MediaObject } from "@ngrok/mantle/media-object";
import { Skeleton } from "@ngrok/mantle/skeleton";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Skeleton docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Skeleton className="w-full" />
		</PreviewCanvas>
	);
}

/** The "Accessibility" example on the Skeleton docs page. */
export function AccessibilityExample() {
	return (
		<PreviewCanvas>
			<div role="status" aria-live="polite">
				<span className="sr-only">Loading profile…</span>
				<Skeleton className="h-12 w-12 rounded-full" />
			</div>
		</PreviewCanvas>
	);
}

/** The "Composition: Skeleton within a Media Object" example on the Skeleton docs page. */
export function CompositionSkeletonWithinAMediaObjectExample() {
	return (
		<PreviewCanvas>
			<MediaObject.Root className="w-full max-w-96 items-center">
				<MediaObject.Media>
					<Skeleton className="h-12 w-12 rounded-full" />
				</MediaObject.Media>
				<MediaObject.Content className="space-y-3">
					<Skeleton className="w-full" />
					<Skeleton className="w-4/5" />
				</MediaObject.Content>
			</MediaObject.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Skeleton docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Skeleton asChild className="h-12 w-12 rounded-full">
				<span />
			</Skeleton>
		</PreviewCanvas>
	);
}
