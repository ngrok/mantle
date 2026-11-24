/**
 * Re-exports for the Alert component.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert
 */

import * as AlertParts from "./alert-parts.js";

/**
 * Displays a callout for user attention.
 *
 * @useWhen Show a persistent message in the page, such as a warning about degraded data, an error,
 * or a success note, beside the content it describes.
 *
 * @siblings
 * - `Toast`: the message is brief and goes away on its own.
 * - `AlertDialog`: the user must respond before they continue.
 * - `AlertCenter`: several account-level alerts share one bar at the top of the app.
 * - `Empty`: a region has no data, no results, or no access to show.
 *
 * @see https://mantle.ngrok.com/components/feedback/alert
 *
 * @example
 * Composition:
 * ```
 * Alert.Root
 * ├── Alert.Icon
 * ├── Alert.Content
 *     ├── Alert.Title
 *     ├── Alert.Description
 *     ├── Alert.ExpandButton
 *     └── Alert.DismissIconButton
 * ```
 *
 * @example
 * ```tsx
 * <Alert.Root intent="info">
 *   <Alert.Icon />
 *   <Alert.Content>
 *     <Alert.Title>Alert Title</Alert.Title>
 *     <Alert.Description>
 *       Alert description text.
 *     </Alert.Description>
 *     <Alert.ExpandButton count={2} expanded={false} />
 *     <Alert.DismissIconButton />
 *   </Alert.Content>
 * </Alert.Root>
 *```
 */
const Alert = AlertParts;

export {
	//,
	Alert,
};
