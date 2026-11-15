import { Card } from "@ngrok/mantle/card";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Card docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Card.Root>
				<Card.Body>
					<p>Laborum in aute officia adipisicing elit velit.</p>
				</Card.Body>
			</Card.Root>
		</PreviewCanvas>
	);
}

/** The "Header and footer" example on the Card docs page. */
export function HeaderAndFooterExample() {
	return (
		<PreviewCanvas>
			<Card.Root>
				<Card.Header>
					<Card.Title>Card Title Here</Card.Title>
				</Card.Header>
				<Card.Body>
					<p>Laborum in aute officia adipisicing elit velit.</p>
				</Card.Body>
				<Card.Footer>
					<p>Card footer</p>
				</Card.Footer>
			</Card.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Card docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="flex-col gap-4">
			<Card.Root>
				<Card.Header>
					<Card.Title asChild>
						<h2>Card Title as an h2</h2>
					</Card.Title>
				</Card.Header>
				<Card.Body>
					<p>Laborum in aute officia adipisicing elit velit.</p>
				</Card.Body>
			</Card.Root>
		</PreviewCanvas>
	);
}
