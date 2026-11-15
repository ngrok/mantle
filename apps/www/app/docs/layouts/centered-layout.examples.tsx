import { Card } from "@ngrok/mantle/card";
import { CenteredLayout } from "@ngrok/mantle/centered-layout";

import { PreviewCanvas } from "~/components/preview-canvas";

export function CenteredLayoutAsChildExample() {
	return (
		<div className="h-full w-full overflow-auto">
			<CenteredLayout.Root asChild>
				<section aria-label="Password reset">
					<CenteredLayout.Body>
						<span className="text-strong text-lg font-semibold">acme</span>
						<div className="w-full max-w-80">
							<Card.Root>
								<Card.Body>
									<p>Check your email for a reset link.</p>
								</Card.Body>
							</Card.Root>
						</div>
					</CenteredLayout.Body>
					<CenteredLayout.Footer>
						<a
							className="text-muted text-sm hover:underline"
							href="https://ngrok.com"
							target="_top"
						>
							Legal
						</a>
					</CenteredLayout.Footer>
				</section>
			</CenteredLayout.Root>
		</div>
	);
}

/** The "Polymorphism" example on the Centered Layout docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas className="h-dvh p-0 md:p-0">
			<CenteredLayoutAsChildExample />
		</PreviewCanvas>
	);
}
