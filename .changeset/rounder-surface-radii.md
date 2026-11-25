---
"@ngrok/mantle": patch
---

Make the corners of surface components rounder by default. These parts now use `rounded-xl` (0.75rem):

- `Card.Root`, from `rounded-md`
- `Alert.Root`, from `rounded-md`. The `banner` appearance keeps its square corners.
- `CodeBlock.Root`, from `rounded-md`
- `Table.Root`, from `rounded-lg`
- `RadioGroup.Card`, from `rounded-md`
- `CheckboxGroup.Card`, from `rounded-md`
- `Attachment.Root`, from `rounded-lg`
- `DescriptionList.Root`, from `rounded-lg`
- `Well`, from `rounded-md`

If your app sets `rounded-xl` on one of these parts, you can remove that class. To keep the old corners, pass the old class, such as `className="rounded-md"`. `RadioGroup.Card` now merges its classes with `cx`, so a radius class you pass replaces the default.
