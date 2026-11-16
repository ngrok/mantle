import { Alert } from "@ngrok/mantle/alert";
import { Button } from "@ngrok/mantle/button";
import { Field } from "@ngrok/mantle/field";
import { Input } from "@ngrok/mantle/input";
import { Sheet } from "@ngrok/mantle/sheet";
import { useState } from "react";

type ChallengeResult = "verified" | "canceled";

/**
 * The page of the bank that the payment script shows in its frame. The frame
 * has its own origin, so it reports the result to the page with a message.
 */
function challengeDocument(nonce: string): string {
	return `<!doctype html>
<html lang="en">
	<meta charset="utf-8" />
	<title>Bank verification</title>
	<style>
		body { display: grid; min-height: 100vh; margin: 0; place-items: center; font: 14px/1.5 system-ui, sans-serif; }
		form { display: grid; box-sizing: border-box; gap: 12px; width: min(20rem, calc(100vw - 2rem)); padding: 24px; border-radius: 12px; background: white; color: #1f1f1f; }
		h1 { margin: 0; font-size: 16px; }
		input, button { padding: 8px 12px; border: 1px solid #8f8f8f; border-radius: 6px; font: inherit; }
		button[type="submit"] { background: #1f1f1f; color: white; }
	</style>
	<form>
		<h1>Verify your card</h1>
		<label for="code">Enter the code from your bank</label>
		<input id="code" inputmode="numeric" autocomplete="one-time-code" required />
		<button type="submit">Verify</button>
		<button type="button" id="cancel">Cancel</button>
	</form>
	<script nonce="${nonce}">
		const code = document.getElementById("code");
		const reply = (result) => parent.postMessage(result, "*");
		addEventListener("focus", () => code.focus());
		document.querySelector("form").addEventListener("submit", (event) => {
			event.preventDefault();
			reply("verified");
		});
		document.getElementById("cancel").addEventListener("click", () => reply("canceled"));
		addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				reply("canceled");
			}
		});
	</script>
</html>`;
}

/**
 * A stand-in for the script of a payment provider. It does to the page what
 * Stripe.js does for a 3-D Secure challenge or a wallet sign-in:
 *
 * - It puts a wrapper on `<body>` that fills the viewport above every layer.
 * - It shows the bank's page in a frame with its own origin. The frame sets
 *   `pointer-events: auto`, because an open sheet turns them off on `<body>`.
 * - It moves focus to the frame from the page.
 * - It saves the inline style of `<body>` and puts that style back on close.
 *
 * @example
 * const result = await confirmWithBank();
 */
function confirmWithBank(): Promise<ChallengeResult> {
	return new Promise((resolve) => {
		const popup = document.createElement("div");
		popup.style.display = "none";
		const frame = document.createElement("iframe");
		frame.title = "Bank verification";
		frame.sandbox.add("allow-scripts", "allow-forms");
		// Why the nonce: the docs site has a content security policy, and the
		// frame takes that policy from the page.
		frame.srcdoc = challengeDocument(document.querySelector("script")?.nonce ?? "");
		popup.append(frame);
		document.body.append(popup);

		frame.addEventListener(
			"load",
			() => {
				const bodyStyle = document.body.style.cssText;
				document.body.style.overflow = "hidden";
				popup.style.cssText =
					"position: fixed; inset: 0; z-index: 2147483647; background: rgb(40 40 40 / 0.75);";
				frame.style.cssText =
					"position: absolute; left: 0; top: 0; width: 100%; height: 100%; border: 0; color-scheme: only light; pointer-events: auto;";
				frame.focus();

				const onMessage = (event: MessageEvent) => {
					if (event.source !== frame.contentWindow) {
						return;
					}
					window.removeEventListener("message", onMessage);
					popup.remove();
					document.body.style.cssText = bodyStyle;
					resolve(event.data === "verified" ? "verified" : "canceled");
				};
				window.addEventListener("message", onMessage);
			},
			{ once: true },
		);
	});
}

/**
 * Demonstrates a `Sheet` under the popup of a payment script. The sheet has no
 * code for the popup: focus stays in the bank's frame, Escape in the frame
 * closes only the popup, and the page takes clicks after the popup closes.
 *
 * @example
 * <PaymentPopupDemo />
 */
export function PaymentPopupDemo() {
	const [status, setStatus] = useState<"idle" | "confirming" | ChallengeResult>("idle");

	return (
		<Sheet.Root onOpenChange={() => setStatus("idle")}>
			<Sheet.Trigger asChild>
				<Button type="button" appearance="filled" intent="neutral">
					Add payment method
				</Button>
			</Sheet.Trigger>
			<Sheet.Content>
				<Sheet.Header>
					<Sheet.TitleGroup>
						<Sheet.Title>Add payment method</Sheet.Title>
						<Sheet.Actions>
							<Sheet.CloseIconButton />
						</Sheet.Actions>
					</Sheet.TitleGroup>
					<Sheet.Description>Your bank asks you to verify the card.</Sheet.Description>
				</Sheet.Header>
				<form
					className="contents"
					onSubmit={(event) => {
						event.preventDefault();
						setStatus("confirming");
						void confirmWithBank().then(setStatus);
					}}
				>
					<Sheet.Body className="space-y-4">
						<Field.Item name="cardholder">
							<Field.Label>Name on card</Field.Label>
							<Field.Control>
								<Input autoComplete="cc-name" defaultValue="Ada Lovelace" />
							</Field.Control>
						</Field.Item>
						<Field.Item name="card-number">
							<Field.Label>Card number</Field.Label>
							<Field.Control>
								<Input autoComplete="cc-number" defaultValue="4000 0027 6000 3184" />
							</Field.Control>
							<Field.Description>A test card that needs a 3-D Secure challenge.</Field.Description>
						</Field.Item>
						{status === "verified" && (
							<Alert.Root intent="success">
								<Alert.Icon />
								<Alert.Content>
									<Alert.Title>Card verified</Alert.Title>
									<Alert.Description>The bank approved the card.</Alert.Description>
								</Alert.Content>
							</Alert.Root>
						)}
						{status === "canceled" && (
							<Alert.Root intent="warning">
								<Alert.Icon />
								<Alert.Content>
									<Alert.Title>Card not verified</Alert.Title>
									<Alert.Description>
										You canceled the check. Save the card again.
									</Alert.Description>
								</Alert.Content>
							</Alert.Root>
						)}
					</Sheet.Body>
					<Sheet.Footer>
						<Sheet.Close asChild>
							<Button type="button" appearance="outlined" intent="neutral">
								Close
							</Button>
						</Sheet.Close>
						<Button
							type="submit"
							appearance="filled"
							intent="neutral"
							isLoading={status === "confirming"}
						>
							Save card
						</Button>
					</Sheet.Footer>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	);
}
