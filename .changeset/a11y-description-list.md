---
"@ngrok/mantle": patch
---

`DescriptionList` exports `DescriptionListItemProps`, `DescriptionListLabelProps`, and `DescriptionListValueProps` alongside `DescriptionListProps`. A `data-slot` passed to `DescriptionList.Root` now joins in front of `"description-list"` instead of replacing it, and every part documents its `data-slot`. The part summaries in the built types now match their declarations.
