import { AppLayout } from "@ngrok/mantle/app-layout";
import { Button } from "@ngrok/mantle/button";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import { useState } from "react";

/**
 * The AppLayout shell on its own — no sidebar. A toggleable `Notice` strip
 * pinned above everything, a toolbar `Header`, and a `Content` card that is
 * the only scroll container.
 */
export function AppLayoutDemo() {
	const [showNotice, setShowNotice] = useState(true);

	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Notice>
					{showNotice && (
						<div className="text-on-filled flex items-center gap-2 bg-red-600 px-4 py-1 text-xs">
							<WarningCircleIcon weight="fill" className="shrink-0" />
							You are impersonating jane@example.com in read-only mode.
						</div>
					)}
				</AppLayout.Notice>
				<AppLayout.Body>
					<AppLayout.Inset>
						<AppLayout.Content>
							<AppLayout.Header>
								<p className="text-strong text-sm font-medium">Endpoints</p>
								<Button
									type="button"
									appearance="outlined"
									intent="neutral"
									className="ml-auto"
									size="sm"
									onClick={() => setShowNotice((current) => !current)}
								>
									Toggle notice
								</Button>
							</AppLayout.Header>
							<div className="space-y-4 p-6">
								{Array.from({ length: 10 }, (_, index) => (
									<div key={index} className="border-card-muted rounded-lg border p-4">
										<p className="text-strong text-sm font-medium">Row {index + 1}</p>
										<p className="text-muted text-sm">
											Scroll happens inside this card with `overscroll-none` — the shell never moves
											and scroll never bounces the page.
										</p>
									</div>
								))}
							</div>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>
		</div>
	);
}

/**
 * `AppLayout.Content` swapping its default `<div>` for a consumer element via
 * `asChild` — here a `<section>`; in a real app shell that owns the document,
 * this is how you compose the `Main` landmark.
 */
export function AppLayoutPolymorphismDemo() {
	return (
		<div className="h-full w-full">
			<AppLayout.Root className="rounded-lg">
				<AppLayout.Body>
					<AppLayout.Inset>
						<AppLayout.Content asChild>
							<section aria-label="Demo content">
								<p className="text-muted p-6 text-sm">
									This scroll card is a `&lt;section&gt;` — inspect it to see the merged classes and
									`data-slot=&quot;app-layout-content&quot;`.
								</p>
							</section>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>
		</div>
	);
}
