---
"@ngrok/mantle": patch
---

`Alert.ExpandButton` renders its caret through `Button`'s `icon` slot again, so the count, the word, and the
caret sit apart instead of running together as `+3more`.

Version 0.83.3 wrapped a button's children in one label slot, which made them a single flex item. The button's
`gap` then fell between that label and nothing else, and the count's `min-width` lost the formatting context
that held its width. `Alert.ExpandButton` passed all three pieces as children, so it collapsed.

The caret now goes through `icon` with `iconPlacement="end"`, which is what the label-slot change asks every
call site to do. The count and the word stay children, and the button sets `display: contents` on the label
slot, so both are flex items of the button again.

A call site of your own that passes an icon as a child needs the same move:

```tsx
// ❌ the icon and the label share one flex item, so the button's `gap` never falls between them
<Button appearance="filled" intent="neutral">
	<PlusIcon />
	Create endpoint
</Button>

// ✅
<Button appearance="filled" intent="neutral" icon={<PlusIcon />}>
	Create endpoint
</Button>
```
