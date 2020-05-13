// @ts-check
const Discord = require("discord.js");
const { Paginator } = require("../dist/index");
// @ts-ignore
const config = require("../config.json");
const client = new Discord.Client();

client.on("ready", () => console.log(`Ready and logged in as ${client.user.username}`));
client.on("message", async (message) => {
	if (message.author.bot || !message.content.startsWith(config.prefix)) return;

	const [command, ...args] = message.content.slice(config.prefix.length).split(/ +/g);

	if (command === "without-embed") await withoutEmbed(message).catch(console.error);
	else if (command === "embed-without-footer") await embedWithoutFooter(message).catch(console.error);
	else if (command === "embed-with-footer-but-no-text") await embedWithFooterButNoText(message).catch(console.error);
	else if (command === "eval") {	// For additional testing
		if (message.author.id !== config.ownerID) return;

		const code = args.join(" ").slice(6, -3);
		await eval(`(async()=>{${code}})();`).catch(console.error);
	}
});

const dummy = "Lorem Ipsum is simply dummy text of the printing and typesetting industry." +
	" Lorem Ipsum has been the industry's standard dummy text ever since the 1500s...";

/** @param {Discord.Message} message */
async function withoutEmbed(message) {
	const pages = ["Page one", "Page two", "Page three", "Page four", "Page five"]
		.map(x => x += `\n${dummy}\n\nPage {0}/{1} - FAKE-TIMESTAMP`);

	const paginator = new Paginator({ pages, userID: message.author.id });

	logPaginator(paginator);
	await paginator.start(message.channel);
}

/** @param {Discord.Message} message */
async function embedWithoutFooter(message) {
	const paginator = new Paginator({ userID: message.author.id });

	for (let i = 1; i <= 5; i++) {
		paginator.addPage({ description: `Page ${i}\n${dummy}` });
	}

	logPaginator(paginator);
	await paginator.start(message.channel);
}

/** @param {Discord.Message} message */
async function embedWithFooterButNoText(message) {
	const embed = {
		title: "Constant Title",
		footer: { icon_url: message.author.displayAvatarURL() }
	};

	const paginator = new Paginator({ embed, userID: message.author.id });

	for (let i = 1; i <= 5; i++) {
		paginator.addPage(
			new Discord.MessageEmbed().setDescription(`Page ${i}\n${dummy}`)
		);
	}

	logPaginator(paginator);
	await paginator.start(message.channel);
}

function logPaginator(paginator) {
	paginator.on("end", console.log).on("error", console.error);
}

client.login(config.token);