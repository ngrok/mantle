/**
 * Re-exports for the Card component.
 *
 * @see https://mantle.ngrok.com/components/structure/card
 */

import * as CardParts from "./card-parts.js";

/**
 * A container that displays content in a box resembling a physical card.
 *
 * @useWhen Group related content in a raised box, with an optional header and footer.
 *
 * @siblings
 * - `Well`: the content is secondary and sits inset in the page, such as a code sample, a note, or a read-only summary.
 * - `Separator`: adjacent content needs a divider and no box.
 * - `MediaObject`: an icon or a figure sits beside a block of text, with no border.
 *
 * @see https://mantle.ngrok.com/components/structure/card
 *
 * @example
 * Composition:
 * ```
 * Card.Root
 * ├── Card.Header
 * │   └── Card.Title
 * ├── Card.Body
 * └── Card.Footer
 * ```
 *
 * @example
 * ```tsx
 * <Card.Root>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 * </Card.Root>
 *
 * <Card.Root>
 *   <Card.Header>
 *     <Card.Title>Card Title Here</Card.Title>
 *   </Card.Header>
 *   <Card.Body>
 *     <p>Laborum in aute officia adipisicing elit velit.</p>
 *   </Card.Body>
 *   <Card.Footer>
 *     <p>Card footer</p>
 *   </Card.Footer>
 * </Card.Root>
 * ```
 */
const Card = CardParts;

export {
	//,
	Card,
};

export type {
	//,
	CardProps,
	CardTitleProps,
} from "./card.js";
