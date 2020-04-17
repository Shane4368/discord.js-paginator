//@ts-check
const Discord = require("discord.js");
const { Paginator } = require("../dist/index");
// @ts-ignore
const config = require("../config.json");

const client = new Discord.Client({ disableMentions: "all" });

client.on("ready", () => console.log(`Ready and logged in as ${client.user.username}`));

client.on("message", async (message) =>
{
	if (message.author.bot) return;
	if (!message.content.startsWith(config.prefix)) return;

	const args = message.content.slice(config.prefix.length).split(/ +/g);
	const command = args.shift();
	const timeout = 60000;
	const stoppable = true;

	if (command === "page")
	{
		const pages = ["Page 1", "Page 2", "Page 3", "Page 4", "Page 5"]
			.map(x => x += " content placeholder for smth\n\nPage {0}/{1} <— time");

		const paginator = new Paginator({
			pages,
			timeout,
			stoppable,
			userID: message.author.id
		});

		paginator.on("end", (reason) => console.log(reason));

		await paginator.start(message.channel).catch(console.error);
	}
	else if (command === "page-embed")
	{
		const embed = { color: 0x0000ff, title: "Constant Title" };
		const paginator = new Paginator({
			embed,
			timeout,
			stoppable,
			userID: message.author.id
		});

		for (let i = 1; i <= 4; i++)
		{
			// @ts-ignore
			paginator.addPage(new Discord.MessageEmbed()
				.setDescription(`Page ${i} content placeholder for smth`));
		}

		paginator.on("end", (reason) => console.log(reason));

		await paginator.start(message.channel).catch(console.error);
	}
});

client.login(config.token);