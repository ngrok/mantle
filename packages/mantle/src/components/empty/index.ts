/**
 * Re-exports for the Empty component.
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 */

import * as EmptyParts from "./empty-parts.js";

/**
 * Compound component for rendering empty states. Use with `Empty.Root`,
 * `Empty.Icon`, `Empty.Title`, `Empty.Description`, and `Empty.Actions`.
 *
 * @useWhen A region has no data, no results, or no access to show.
 *
 * @siblings
 * - `Skeleton`: the region is still loading.
 * - `Alert`: a message sits beside content that still exists.
 * - `Well`: the state needs an inset panel; compose `Empty.Root` inside a `Well`.
 *
 * @see https://mantle.ngrok.com/components/feedback/empty
 *
 * @example
 * Composition:
 * ```
 * Empty.Root
 * ├── Empty.Icon
 * ├── Empty.Title
 * ├── Empty.Description
 * └── Empty.Actions
 * ```
 *
 * @example
 * ```tsx
 * <Empty.Root>
 *   <Empty.Icon svg={<GhostIcon />} />
 *   <Empty.Title>No endpoints yet</Empty.Title>
 *   <Empty.Description>
 *     Create your first endpoint to get started.
 *   </Empty.Description>
 *   <Empty.Actions>
 *     <Button appearance="filled" intent="neutral">Create endpoint</Button>
 *   </Empty.Actions>
 * </Empty.Root>
 * ```
 */
const Empty = EmptyParts;

export {
	//,
	Empty,
};
