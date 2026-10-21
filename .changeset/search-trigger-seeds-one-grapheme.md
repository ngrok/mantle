---
"@ngrok/mantle": patch
---

`Command.SearchTrigger` now seeds the palette query with a typed character that is more than one code point, such as a skin-tone emoji or a decomposed accent. Before, `searchActionFromKeyDown` counted code points, so it read such a key as a named key and dropped the character.
