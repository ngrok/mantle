/**
 * Re-exports for the Steps component.
 *
 * @see https://mantle.ngrok.com/components/structure/steps
 */

import * as StepsParts from "./steps-parts.js";

/**
 * A read-only setup guide: an ordered list of steps down a page, each marked by
 * a numbered circle in a left gutter, joined by one continuous vertical rail.
 * Each step stays visible, and nothing is interactive.
 *
 * Composition order is the numbering. The number is a CSS counter, and the
 * marker's silhouette comes from the item's own position in the list. Thus a
 * step that you add, remove, or render conditionally renumbers the rest, and
 * the first server-rendered paint is already correct. There is no effect, no
 * registration, and no index to keep in sync.
 *
 * The markers are `aria-hidden` decoration. Step position comes from the
 * `<ol>`, which a screen reader announces as "2 of 3".
 *
 * @useWhen Show a read-only, numbered sequence of setup or onboarding steps down a page, with each
 * step's content visible at once.
 *
 * @siblings
 * - `Tabs`: the reader clicks a step to show one panel at a time.
 * - `Accordion`: each step collapses, and the reader opens the one they need.
 *
 * @see https://mantle.ngrok.com/components/structure/steps
 *
 * @example
 * Composition:
 * ```
 * Steps.Root
 * └── Steps.Item
 *     └── Steps.Title
 * ```
 *
 * @example
 * ```tsx
 * <Steps.Root>
 *   <Steps.Item>
 *     <Steps.Title>Install the ngrok agent</Steps.Title>
 *     <p>Download the agent for your platform.</p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title asChild>
 *       <h2>Add your authtoken</h2>
 *     </Steps.Title>
 *     <p>
 *       Run <Code>ngrok config add-authtoken</Code> with the token from your dashboard.
 *     </p>
 *   </Steps.Item>
 *   <Steps.Item>
 *     <Steps.Title>Get a public URL for your app</Steps.Title>
 *     <p>Start a tunnel to the port your app listens on.</p>
 *   </Steps.Item>
 * </Steps.Root>
 * ```
 */
const Steps = StepsParts;

export {
	//,
	Steps,
};

export type {
	//,
	StepsItemProps,
	StepsRootProps,
	StepsTitleProps,
} from "./steps.js";
