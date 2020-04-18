# discord.js-paginator
[![Codacy Badge][codacy-badge]][codacy-dash]

A reaction-based paginator for [discord.js][discord.js-repo].

## Installation
Ensure you have git installed, then run `npm i shane4368/discord.js-paginator`.

## Compatibility
This package does not work on discord.js v11 and previous versions.
Only discord.js v12 is currently supported.

## Examples

### Basic setup
```js
const { Paginator } = require("discord.js-paginator");

const paginator = new Paginator();

// Display message when destroyed or timed out.
paginator.on("end", console.log);

// {0} - first occurrence will be replaced with current page number.
// {1} - first occurrence will be replaced with total page count.
paginator.addPage("This is the first page.\n\nPage {0}/{1}")
	.addPage("This is the second page.\n\nPage {0}/{1}")
	.addPage("This is the third page.\n\nPage {0}/{1}")
	.addPage("This is the fourth page.\n\nPage {0}/{1}")
	.listen(message.author.id);

// Ensure your function is async before using 'await' keyword.
// Ensure you handle possible errors here.
await paginator.start(message.channel);
```

### Using the Paginator constructor
```js
const paginator = new Paginator({
	circular: true,	// Whether or not to allow pages to loop.
	embed: {},	// An embed template to use across pages.
	emojis: {},	// Override the default emojis specified.
	pages: [],	// Can be a string, embed object or MessageEmbed
	timeout: 1000 * 60,	// Duration of the paginator's lifetime.
	userID: message.author.id,	// Self-explanatory.
	stoppable: true	// Whether or not to include the stop emoji.
});
```

## Notes
- All properties set in the constructor can be set after initialization
using the helper methods.

- Supports custom guild emojis by specifying the id.<br>
Defaults to `{ front: "⏮", rear: "⏭", back: "◀", next: "▶", stop: "⏹️" }`.

- Place the page number format in the footer text when using an embed.
If no footer is set, one will be created automatically.

- Default timeout is `120000` (2 minutes).


[//]: # (-- REFERENCE LINKS --)

[discord.js-repo]: https://github.com/discordjs/discord.js

[codacy-badge]: https://api.codacy.com/project/badge/Grade/34fd900141914aeab4fdfc1c1ae48f80

[codacy-dash]: https://www.codacy.com/manual/Shane4368/discord.js-paginator?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Shane4368/discord.js-paginator&amp;utm_campaign=Badge_Grade