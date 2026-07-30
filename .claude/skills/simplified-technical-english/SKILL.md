---
name: simplified-technical-english
description: "Write concise, unambiguous technical prose with the ASD-STE100 Simplified Technical English rules in CONVENTIONS.md § Writing. Use WHENEVER you write or edit a code comment, JSDoc, a changeset, a decision doc, a docs-page paragraph, a commit message, or a pull request description. Also use when the user asks to tighten, shorten, de-fluff, or clean up any of those. Skip it for chat replies, product copy, and marketing text."
---

# Simplified Technical English

[CONVENTIONS.md § Writing](../../../CONVENTIONS.md#writing) holds the rules. This file is only how they get applied.

**The section is the standard; this file is a trigger.** Where the two appear to disagree, CONVENTIONS.md governs: report the mismatch, do not edit either file mid-task.

## What to do

1. Read [§ Writing](../../../CONVENTIONS.md#writing). Read it again rather than write from memory — the carve-outs are the part that gets misremembered.
2. Classify the text. Procedural prose — a commit subject, a step, a `TODO` — takes the imperative and 20 words. Descriptive prose — JSDoc, a changeset, a decision doc, docs-page copy, a PR body — states the contract or the reason. Past 25 words is the smell.
3. Apply the rules to the prose you write or edit in this task. Nothing else.
4. Run the self-check below.

## Before and after

| Instead of                                                                                                                    | Write                                                             |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `It should be noted that the retry logic may potentially be triggered when the upstream service is experiencing degradation.` | `The client retries when upstream returns 5xx.`                   |
| `The input component for the Command. It provides the input for the command palette.`                                         | `The palette's query field.`                                      |
| `By default the selected item's text will be rendered.`                                                                       | `Renders the selected item's text by default.`                    |
| `It should not be styled to ensure correct positioning.`                                                                      | `Do not style this part — the trigger positions it.`              |
| `// This could be removed, or simplified`                                                                                     | Delete it. Investigation narration belongs in the PR description. |
| `This PR essentially refactors the handler in order to facilitate improved testability.`                                      | `Split the handler so the parser runs without a server.`          |
| `The configuration file parsing utility function`                                                                             | `The config parser`                                               |

## Self-check

- a banned word that no carve-out covers — and remember the carve-outs: `Provider`, `enabled`, `performance`, `not just`, `high-leverage`, a `seamless` tile
- the passive voice where the actor is known, a compound tense, or an `-ing` form as the main verb
- one idea per sentence, and the condition first
- a noun stack over three words, or an abbreviation that is not on the exempt list
- a comment or JSDoc summary that restates the identifier
- a sentence past 25 words: it usually wants a list, not a trim
- a changed JSDoc summary whose other copies and `components-surface.json` snapshot are still stale

Fix what you find.

## What not to do

- Do not sweep unrelated prose into the same pull request. The rules cover the lines you touch.
- Do not change what a shipped `decisions/*.md` decided. Its prose is in scope; its decision and its dated evidence are not.
- Do not paraphrase quoted upstream text, such as MDN or a spec. Keep it verbatim, and keep its `@see` link.
- Do not reflow an ASCII composition tree or the code inside an `@example` fence.
- Do not narrate the check to the user. The `Conventions pass:` note [AGENTS.md](../../../AGENTS.md) requires is where it belongs.
