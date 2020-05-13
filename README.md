# discord.js-paginator

[![Codacy Badge][codacy-badge]][codacy-dash]
![GitHub package.json version (branch)][package.json-version]
![GitHub LICENSE](https://img.shields.io/github/license/Shane4368/discord.js-paginator.svg)
![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

A simple reaction-based paginator for [discord.js][discord.js-repo].

## Installation
Ensure you have git installed, then run `npm i shane4368/discord.js-paginator`.

## Compatibility
This package does not work with discord.js v11 and previous versions.
Only discord.js v12 is currently supported.

## Examples

### Basic setup
```js
const { Paginator } = require("discord.js-paginator");

const paginator = new Paginator({ userID: message.author.id });

// Log message when destroyed or timed out.
paginator.on("end", console.log);
// Log error when it occurs.
paginator.on("error", console.error);

// {0} - first occurrence will be replaced with current page number.
// {1} - first occurrence will be replaced with total page count.
paginator.addPage("This is the first page.\n\nPage {0}/{1}")
	.addPage("This is the second page.\n\nPage {0}/{1}")
	.addPage("This is the third page.\n\nPage {0}/{1}")
	.addPage("This is the fourth page.\n\nPage {0}/{1}");

// Ensure your function is async before using 'await' keyword.
await paginator.start(message.channel).catch(console.error);
```

### Using the Paginator constructor
```js
const paginator = new Paginator({
	circular: true,		// Whether or not to allow pages to loop.
	embed: {},		// An embed template to use across pages.
	emojis: {},		// Override the default emojis specified.
	pages: [],		// Array of string, embed object or MessageEmbed.
	timeout: 1000 * 60,		// Duration of the paginator's lifetime.
	userID: message.author.id,	// Self-explanatory.
	stoppable: false		// Whether or not to include the stop emoji.
});
```

### Miscellaneous
```js
// Setting embed template.
paginator.setEmbedTemplate({
	color: 0x00b6eb,
	title: "Constant Title",
	footer: {
		text: "Custom footer format {0}/{1}"
	}
});

// Adding embed pages.
paginator.addPage({ description: "This is the first page." })
	.addPage({ description: "This is the second page." });

// Disabling front and rear emojis.
paginator.setEmojis({ front: null, rear: null });
// Overriding defaults for front and rear emojis.
paginator.setEmojis({ front: "👈", rear: "👉" });

// Enabling the stop emoji.
paginator.setStoppable(true);
```

## Notes
- All properties set in the constructor may be set after initialization
using the helper methods.

- Supports custom guild emoji by specifying the id.<br>
Defaults to `{ front: "⏮", rear: "⏭", back: "◀", next: "▶", stop: "⏹️" }`.

- Place the page number format in the footer text when using an embed.
If no footer is present, one will be automatically created.

- Default timeout is `120000` (2 minutes).

- The paginator must have at least two pages.

<!-- -------------------------------- REFERENCE LINKS -------------------------------- -->

[discord.js-repo]: https://github.com/discordjs/discord.js
[package.json-version]: https://img.shields.io/github/package-json/v/Shane4368/discord.js-paginator/master.svg
[codacy-badge]: https://api.codacy.com/project/badge/Grade/34fd900141914aeab4fdfc1c1ae48f80
[codacy-dash]: https://www.codacy.com/manual/Shane4368/discord.js-paginator?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Shane4368/discord.js-paginator&amp;utm_campaign=Badge_Grade