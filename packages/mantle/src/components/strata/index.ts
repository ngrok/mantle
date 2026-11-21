/**
 * Re-exports for the Strata component.
 *
 * @see https://mantle.ngrok.com/components/structure/strata
 */

import * as StrataParts from "./strata-parts.js";

/**
 * A page of titled sections, each one explained beside its content. Every
 * section pairs a `Strata.Header` (its `Title` and `Description`) with a
 * `Strata.Body` of controls. `Strata.Root` stacks the sections with a
 * hairline between them. Below the `md` breakpoint the header stacks above its
 * own content, so the pairing survives a narrow viewport. It is the shape of a
 * settings page, a resource configuration editor, and any form long enough that
 * each group needs its own explanation.
 *
 * It owns structure only: the grid, the rhythm, and the rules between sections.
 * Reach for [Card](https://mantle.ngrok.com/components/structure/card) when a
 * group needs a raised surface of its own, for
 * [MediaObject](https://mantle.ngrok.com/components/structure/media-object)
 * when the thing beside the text is an image or an icon, and for
 * [DescriptionList](https://mantle.ngrok.com/components/data-display/description-list)
 * when the pairs are read-only term/value data rather than headed sections.
 *
 * @useWhen Lay out a settings page, a configuration editor, or a long form as titled sections, each
 * one explained beside its controls: the title and description on the left, the form fields on the right.
 *
 * @siblings
 * - `Card`: a group needs a raised surface of its own.
 * - `MediaObject`: the thing beside the text is an image or an icon.
 * - `DescriptionList`: the pairs are read-only label and value data, not headed sections.
 *
 * @see https://mantle.ngrok.com/components/structure/strata
 *
 * @example
 * Composition:
 * ```
 * Strata.Root
 * └── Strata.Section
 *     ├── Strata.Header
 *     │   ├── Strata.Title
 *     │   └── Strata.Description
 *     └── Strata.Body
 * ```
 *
 * @example
 * ```tsx
 * <Strata.Root>
 *   <Strata.Section>
 *     <Strata.Header>
 *       <Strata.Title>Providers</Strata.Title>
 *       <Strata.Description>What providers keys may call.</Strata.Description>
 *     </Strata.Header>
 *     <Strata.Body>
 *       <ProviderScopePicker />
 *     </Strata.Body>
 *   </Strata.Section>
 *   <Strata.Section>
 *     <Strata.Header>
 *       <Strata.Title>Routing rules</Strata.Title>
 *       <Strata.Description>Define how requests are authenticated.</Strata.Description>
 *     </Strata.Header>
 *     <Strata.Body>
 *       <RoutingRuleList />
 *     </Strata.Body>
 *   </Strata.Section>
 * </Strata.Root>
 * ```
 */
const Strata = StrataParts;

export {
	//,
	Strata,
};
