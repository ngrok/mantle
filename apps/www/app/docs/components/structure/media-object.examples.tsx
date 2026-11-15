import { MediaObject } from "@ngrok/mantle/media-object";

import { PreviewCanvas } from "~/components/preview-canvas";

export const ExampleMedia = () => (
	<svg
		className="h-16 w-16 border border-gray-300 bg-white text-gray-300"
		preserveAspectRatio="none"
		stroke="currentColor"
		fill="none"
		viewBox="0 0 200 200"
		aria-hidden="true"
	>
		<path vectorEffect="non-scaling-stroke" strokeWidth={1} d="M0 0l200 200M0 200L200 0" />
	</svg>
);

/** The first example on the Media Object docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<MediaObject.Root>
				<MediaObject.Media>
					<ExampleMedia />
				</MediaObject.Media>
				<MediaObject.Content>
					<h4 className="text-lg font-medium">Lorem ipsum</h4>
					<p className="mb-4 mt-1">
						Repudiandae sint consequuntur vel. Amet ut nobis explicabo numquam expedita quia omnis
						voluptatem. Minus quidem ipsam quia iusto.
					</p>
					<p>Ea eiusmod eiusmod aute reprehenderit exercitation eu ea id adipisicing occaecat.</p>
				</MediaObject.Content>
			</MediaObject.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Media Object docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<MediaObject.Root asChild>
				<a href="https://ngrok.com">
					<MediaObject.Media>
						<ExampleMedia />
					</MediaObject.Media>
					<MediaObject.Content>
						<h4 className="text-lg font-medium">Lorem ipsum</h4>
						<p>Repudiandae sint consequuntur vel.</p>
					</MediaObject.Content>
				</a>
			</MediaObject.Root>
		</PreviewCanvas>
	);
}
