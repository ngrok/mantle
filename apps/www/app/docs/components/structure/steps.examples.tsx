import { Card } from "@ngrok/mantle/card";
import { Code } from "@ngrok/mantle/code";
import { Steps } from "@ngrok/mantle/steps";

import { PreviewCanvas } from "~/components/preview-canvas";

/** The first example on the Steps docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas>
			<Steps.Root className="w-full max-w-xl">
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
					<Card.Root>
						<Card.Body>
							<p>
								Download the agent for your platform, or install it with{" "}
								<Code>brew install ngrok</Code>.
							</p>
						</Card.Body>
					</Card.Root>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title>Add your authtoken</Steps.Title>
					<Card.Root>
						<Card.Body>
							<p>
								Run <Code>ngrok config add-authtoken $YOUR_AUTHTOKEN</Code> to write the token into
								your agent config file.
							</p>
						</Card.Body>
					</Card.Root>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title>Get a public URL for your app</Steps.Title>
					<Card.Root>
						<Card.Body>
							<p>
								Run <Code>ngrok http 8080</Code> against the port your app listens on.
							</p>
						</Card.Body>
					</Card.Root>
				</Steps.Item>
			</Steps.Root>
		</PreviewCanvas>
	);
}

const needsDomain = true;

/** The "Conditional steps" example on the Steps docs page. */
export function ConditionalExample() {
	return (
		<PreviewCanvas>
			<Steps.Root className="w-full max-w-xl">
				<Steps.Item>
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
				{needsDomain && (
					<Steps.Item>
						<Steps.Title>Bring your own domain</Steps.Title>
					</Steps.Item>
				)}
			</Steps.Root>
		</PreviewCanvas>
	);
}

/** The "Collapsing the marker column" example on the Steps docs page. */
export function CollapseMarkersExample() {
	return (
		<PreviewCanvas>
			<Steps.Root className="w-full max-w-xl max-md:ps-0">
				<Steps.Item className="max-md:border-s-0 max-md:ps-0 max-md:[&>[data-slot=steps-marker]]:hidden">
					<Steps.Title>Install the ngrok agent</Steps.Title>
				</Steps.Item>
				<Steps.Item className="max-md:border-s-0 max-md:ps-0 max-md:[&>[data-slot=steps-marker]]:hidden">
					<Steps.Title>Add your authtoken</Steps.Title>
				</Steps.Item>
			</Steps.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the Steps docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<Steps.Root className="w-full max-w-xl">
				<Steps.Item>
					<Steps.Title asChild>
						<h2>Install the ngrok agent</h2>
					</Steps.Title>
				</Steps.Item>
				<Steps.Item>
					<Steps.Title asChild>
						<h2>Add your authtoken</h2>
					</Steps.Title>
				</Steps.Item>
			</Steps.Root>
		</PreviewCanvas>
	);
}
