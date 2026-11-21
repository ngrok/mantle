/**
 * Re-exports for the AlertCenter component.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center
 */

import * as AlertCenterParts from "./alert-center-parts.js";

/**
 * A single, top-level entry point for one-to-many account alerts and their
 * upgrade CTAs: the aggregation layer that replaces a stack of independent
 * window banners. Alerts are AUTHORED as `AlertCenter.Item` JSX (mount to
 * show, unmount to dismiss); each item registers its coordination facts, and
 * the center derives the count, the top alert, and the severity ranking from
 * the registrations. `AlertCenter.Bar` shows the highest-severity item inline
 * (with its CTA) and a count-and-caret control; `AlertCenter.Content` expands
 * the remaining items as full-width banners.
 *
 * Ranking is deterministic: severity first (`danger` › `warning` ›
 * `important` › `info` › `success`), then each item's declared `order`, then
 * arrival order within an intent: items mounting together rank in tree
 * order, later arrivals append after the same-intent peers that share their
 * `order`, and a dismissed-then-returning id resumes its original position.
 *
 * Compose `Bar` and `Content` into `AppLayout.Notice`, alongside any other
 * window-level notice. Items may be authored anywhere under `Root`: their
 * children stay in the author's React tree (context providers and error
 * boundaries around an item work; router links resolve where the item is
 * written) while their DOM renders through a stable per-id host that the bar
 * and rows physically adopt, so content keeps its state across re-ranks.
 *
 * Siblings: `Alert` (`@ngrok/mantle/alert`) is a single inline banner you place
 * and control yourself; `Toast` (`@ngrok/mantle/toast`) is for transient,
 * ephemeral notifications; `AppLayout.Notice` (`@ngrok/mantle/app-layout`) is
 * the layout slot this composes INTO, not a competitor. `AlertCenter` answers
 * only the one-to-many case: persistent, ACCOUNT-level alerts that must be
 * ranked and collapsed into a single top-level bar.
 *
 * @useWhen Show persistent account-level alerts, such as usage limits with upgrade actions, in one
 * ranked bar at the top of the app.
 *
 * @siblings
 * - `Alert`: one message sits inline, and you place and control it yourself.
 * - `Toast`: the message is brief and goes away on its own.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert-center
 *
 * @example
 * Composition (items render no DOM in place; their children portal into a
 * stable host the bar or a row adopts):
 * ```
 * AlertCenter.Root
 * ├── AlertCenter.Bar        ← the top-ranked item's children, in Alert chrome
 * ├── AlertCenter.Content    ← every other item's children, as ranked rows
 * └── AlertCenter.Item (0..n, renderless)
 *     └── Alert.Icon / Alert.Content / Alert.Title / Alert.Description /
 *         AlertCenter.DismissIconButton
 * ```
 *
 * @example
 * ```tsx
 * <AppLayout.Root className="fixed inset-0">
 *   <AppLayout.Notice>
 *     {showPreviewNotice && <PreviewNotice />}
 *     <AlertCenter.Root>
 *       <AlertCenter.Bar />
 *       <AlertCenter.Content />
 *       <AlertCenter.Item id="payment-failed" intent="danger">
 *         <Alert.Icon />
 *         <Alert.Content>
 *           <Alert.Title>
 *             Payment failed: we couldn't charge your card.{" "}
 *             <a href="/billing">Update payment method</a>
 *           </Alert.Title>
 *           <Alert.Description>
 *             Update your payment method to avoid a service interruption.
 *           </Alert.Description>
 *         </Alert.Content>
 *       </AlertCenter.Item>
 *       {!dismissed.has("transfer-limit") && (
 *         <AlertCenter.Item id="transfer-limit" intent="warning">
 *           <Alert.Icon />
 *           <Alert.Content>
 *             <Alert.Title>
 *               You've used 92% of your monthly transfer.{" "}
 *               <a href="/billing/choose-a-plan">Upgrade</a>
 *             </Alert.Title>
 *             <AlertCenter.DismissIconButton onClick={() => dismiss("transfer-limit")} />
 *           </Alert.Content>
 *         </AlertCenter.Item>
 *       )}
 *     </AlertCenter.Root>
 *   </AppLayout.Notice>
 *   <AppLayout.Workspace>…</AppLayout.Workspace>
 * </AppLayout.Root>
 * ```
 */
const AlertCenter = AlertCenterParts;

export {
	//,
	AlertCenter,
};

export type {
	//,
	AlertCenterIntent,
	AlertCenterItemProps,
	AlertCenterRootProps,
} from "./alert-center.js";
