import { EventEmitter } from "events";
import {
	Message,
	MessageReaction,
	ReactionCollector,
	TextBasedChannelFields,
	User
} from "discord.js";

export type PaginatorData = {
	/**
	 * The text to be displayed when using embed pages.
	 */
	content: string | null;
	/**
	 * Embed template to use across pages.
	 * All properties on this object will be shown on every page.
	 */
	embed: MessageEmbed | null;
	/**
	 * The emojis to use for skipping the pages.
	 * Specify the id for custom guild emojis.
	 */
	emojis: Partial<PaginatorEmojis> | null;
	/**
	 * The id of the user to listen to.
	 */
	userID: string | null;
	/**
	 * The time in milliseconds of how long to keep the paginator running.
	 * @default 120000
	 */
	timeout: number;
	/**
	 * Whether or not to delete the paginator when timed out.
	 * @default false
	 */
	deleteOnTimeout: boolean;
	/**
	 * The pages to use in the paginator. Must contain at least one page.
	 */
	pages: Array<string | MessageEmbed>;
	/**
	 * If set to `true`, the pages will loop on 'back' and 'next.'
	 * @default true
	 */
	circular: boolean;
	/**
	 * Options to use for the 'info' emoji.
	 */
	infoOptions: PaginatorInfoOptions;
	/**
	 * Options to use for the 'jump' emoji.
	 */
	jumpOptions: PaginatorJumpOptions;
};

export type PaginatorEmojis = {

	/** @default "⏮" */
	front: string | null;

	/** @default "⏭" */
	rear: string | null;

	/** @default "◀" */
	back: string;

	/** @default "▶" */
	next: string;

	/** @default "⏹️" */
	stop: string | null;

	/** @default "🔢" */
	jump: string | null;

	/** @default "🗑" */
	trash: string | null;

	/** @default "ℹ️" */
	info: string | null;
};

export type PaginatorInfoOptions = {
	/**
	 * @default "This is a paginator. React to change page."
	 */
	text: string;
	/**
	 * @default 5000
	 */
	timeout: number;
};

export type PaginatorJumpOptions = {
	/**
	 * @default "Enter page number to jump to."
	 */
	prompt: string;
	/**
	 * Whether or not to show prompt.
	 * @default true
	 */
	showPrompt: boolean;
	/**
	 * @default true
	 */
	deleteResponse: boolean;
	/**
	 * @default 10000
	 */
	timeout: number;
};

/** @internal */
interface MessageEmbed {
	title?: string | null;
	description?: string | null;
	url?: string | null;
	timestamp?: number | null;
	color?: number | null;
	footer?: {
		text?: string | null;
		icon_url?: string | null;
	};
	image?: {
		url: string | null;
	};
	thumbnail?: {
		url: string | null;
	};
	author?: {
		name?: string | null;
		icon_url?: string | null;
		url?: string | null;
	};
	fields?: {
		name?: string | null;
		value?: string | null;
		inline?: boolean | null;
	}[];
}

/** @internal */
const PaginatorEmojisDefault: Readonly<PaginatorEmojis> = {
	front: "⏮",
	rear: "⏭",
	back: "◀",
	next: "▶",
	stop: "⏹️",
	jump: "🔢",
	trash: "🗑",
	info: "ℹ️"
};

/** @internal */
const PaginatorInfoOptionsDefault: Readonly<PaginatorInfoOptions> = {
	text: "This is a paginator. React to change page.",
	timeout: 5000
};

/** @internal */
const PaginatorJumpOptionsDefault: Readonly<PaginatorJumpOptions> = {
	prompt: "Enter page number to jump to.",
	showPrompt: true,
	deleteResponse: true,
	timeout: 10000
};

/** @internal */
function delay(timeout: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, timeout));
}

export class Paginator extends EventEmitter {
	public destroyed = false;

	private static readonly _footerFormat = "Page {0}/{1}";

	private _collector: ReactionCollector | null = null;
	private _embedFooterFormat: string | null = null;
	private _message: Message | null = null;
	private _currentPageIndex = 0;
	private _running = false;

	private _circular: boolean;
	private _content: string | null;
	private _embed: MessageEmbed | null;
	private _emojis: PaginatorEmojis;
	private _pages: Array<string | MessageEmbed>;
	private _timeout: number;
	private _deleteOnTimeout: boolean;
	private _userID: string | null;
	private _infoOptions: PaginatorInfoOptions;
	private _jumpOptions: PaginatorJumpOptions;
	private _pageCount: number;
	private _lastPageIndex: number;

	public constructor(data: Partial<PaginatorData> = {}) {
		super();

		const {
			circular = true,
			content = null,
			embed = null,
			emojis = null,
			pages = [],
			timeout = 120000,
			deleteOnTimeout = false,
			userID = null,
			infoOptions = null,
			jumpOptions = null
		} = data;

		this._circular = circular;
		this._content = content;
		this._embed = embed;
		this._emojis = { ...PaginatorEmojisDefault, ...emojis };
		this._pages = pages;
		this._timeout = timeout;
		this._deleteOnTimeout = deleteOnTimeout;
		this._userID = userID;
		this._infoOptions = { ...PaginatorInfoOptionsDefault, ...infoOptions };
		this._jumpOptions = { ...PaginatorJumpOptionsDefault, ...jumpOptions };
		this._pageCount = this._pages.length;
		this._lastPageIndex = this._pageCount - 1;
	}

	public addPage(page: string | MessageEmbed): this {
		this._pages.push(page);
		this._pageCount++;
		this._lastPageIndex++;
		return this;
	}

	public setPages(pages: Array<string | MessageEmbed>): this {
		this._pages = pages;
		this._pageCount = this._pages.length;
		this._lastPageIndex = this._pageCount - 1;
		return this;
	}

	public setEmojis(emojis: Partial<PaginatorEmojis>): this {
		this._emojis = { ...PaginatorEmojisDefault, ...emojis };
		return this;
	}

	public setInfoOptions(infoOptions: Partial<PaginatorInfoOptions>): this {
		this._infoOptions = { ...PaginatorInfoOptionsDefault, ...infoOptions };
		return this;
	}

	public setJumpOptions(jumpOptions: Partial<PaginatorJumpOptions>): this {
		this._jumpOptions = { ...PaginatorJumpOptionsDefault, ...jumpOptions };
		return this;
	}

	public setTimeout(timeout: number): this {
		this._timeout = timeout;
		return this;
	}

	public setDeleteOnTimeout(deleteOnTimeout: boolean): this {
		this._deleteOnTimeout = deleteOnTimeout;
		return this;
	}

	public setEmbedTemplate(embed: MessageEmbed): this {
		this._embed = embed;
		return this;
	}

	public setContent(content: string): this {
		this._content = content;
		return this;
	}

	public setCircular(circular: boolean): this {
		this._circular = circular;
		return this;
	}

	public listen(userID: string): this {
		this._userID = userID;
		return this;
	}

	/**
	 * @param channel - The channel to create the Paginator in.
	 */
	public async start(channel: TextBasedChannelFields): Promise<void> {
		if (this._running || !this._validate()) return;

		this._running = true;
		await this._setMessage(channel);

		if (this._pageCount === 1) {
			this.emit("end", "Paginator had only 1 page.");
			return;
		}

		const emojis = [
			this._emojis.front,
			this._emojis.back,
			this._emojis.next,
			this._emojis.rear,
			this._emojis.stop,
			this._emojis.jump,
			this._emojis.trash,
			this._emojis.info
		].filter(x => typeof x === "string");

		for (const emoji of emojis) {
			await this._message!.react(emoji!);
			await delay(500);
		}

		const filter = (reaction: MessageReaction, user: User): boolean =>
			emojis.includes(reaction.emoji.id || reaction.emoji.name) && user.id === this._userID;

		this._collector = this._message!.createReactionCollector(filter, { time: this._timeout })
			.on("collect", (reaction, user) => this._onReactionAdded(reaction, user))
			.on("end", () => this._onEnd());
	}

	public destroy(): void {
		this.destroyed = true;
		this._collector!.stop();
		this.emit("end", "Paginator was destroyed.");
	}

	private async _setMessage(channel: TextBasedChannelFields): Promise<void> {
		const page = this._pages[0];

		if (typeof page === "string") {
			this._message = await channel.send(this._renderPageNumber(page));
		}
		else {
			this._message = await channel.send({
				content: this._content,
				embed: this._mergeEmbedTemplate(page)
			});
		}
	}

	private async _editMessage(): Promise<void> {
		const page = this._pages[this._currentPageIndex];

		if (typeof page === "string") {
			await this._message!.edit(this._renderPageNumber(page));
		}
		else {
			await this._message!.edit({ embed: this._mergeEmbedTemplate(page) });
		}
	}

	private _renderPageNumber(page: string): string {
		return page.replace("{0}", (this._currentPageIndex + 1).toString())
			.replace("{1}", this._pageCount.toString());
	}

	private _mergeEmbedTemplate(embed: MessageEmbed): MessageEmbed {
		if (this._embed != null) {
			if (this._embed.author) {
				embed.author = this._embed.author;
			}

			if (this._embed.color) {
				embed.color = this._embed.color;
			}

			if (this._embed.description) {
				embed.description = this._embed.description;
			}

			if (this._embed.fields && this._embed.fields.length > 0) {
				embed.fields = this._embed.fields;
			}

			if (this._embed.footer) {
				embed.footer = this._embed.footer;
			}

			if (this._embed.image) {
				embed.image = this._embed.image;
			}

			if (this._embed.thumbnail) {
				embed.thumbnail = this._embed.thumbnail;
			}

			if (this._embed.timestamp) {
				embed.timestamp = this._embed.timestamp;
			}

			if (this._embed.title) {
				embed.title = this._embed.title;
			}

			if (this._embed.url) {
				embed.url = this._embed.url;
			}
		}

		if (embed.footer) {
			if (this._embedFooterFormat === null) {
				this._embedFooterFormat = embed.footer.text || Paginator._footerFormat;
			}
		}
		else {
			embed.footer = { text: Paginator._footerFormat };

			if (this._embedFooterFormat === null) this._embedFooterFormat = Paginator._footerFormat;
		}

		embed.footer.text = this._renderPageNumber(this._embedFooterFormat);

		return embed;
	}

	private _validate(): boolean {
		if (this.destroyed) {
			this.emit("error", new Error("Tried to use Paginator after it was destroyed."));
			return false;
		}

		if (this._pageCount === 0) {
			this.emit("error", new Error("Paginator must have at least 1 page."));
			return false;
		}

		if (!["back", "next"].every(x => typeof this._emojis[x as keyof PaginatorEmojis] === "string")) {
			this.emit("error", new Error("emojis must have a 'back' and 'next' property."));
			return false;
		}

		if (typeof this._userID !== "string") {
			this.emit("error", new TypeError(`userID must be of type 'string.' Received type '${typeof this._userID}.'`));
			return false;
		}

		if (typeof this._infoOptions.text !== "string") {
			this.emit("error", new TypeError(
				`infoOptions.text must be of type 'string.' Received type '${typeof this._infoOptions.text}.'`
			));
			return false;
		}

		if (typeof this._jumpOptions.prompt !== "string") {
			this.emit("error", new TypeError(
				`jumpOptions.prompt must be of type 'string.' Received type '${typeof this._jumpOptions.prompt}.'`
			));
			return false;
		}

		return true;
	}

	private async _onReactionAdded(reaction: MessageReaction, user: User): Promise<void> {
		const channel = reaction.message.channel;
		let hasManageMessages = false;

		if (channel.type !== "dm") {
			hasManageMessages = channel.permissionsFor(user.client.user!)!.has("MANAGE_MESSAGES");
			if (hasManageMessages) await reaction.users.remove(user);
		}

		switch (reaction.emoji.id || reaction.emoji.name) {
			case this._emojis.front: {
				if (this._currentPageIndex === 0) return;
				this._currentPageIndex = 0;
				break;
			}

			case this._emojis.rear: {
				if (this._currentPageIndex === this._lastPageIndex) return;
				this._currentPageIndex = this._lastPageIndex;
				break;
			}

			case this._emojis.back: {
				if (!this._circular) {
					if (this._currentPageIndex === 0) return;
					this._currentPageIndex--;
				}
				else {
					if (this._currentPageIndex === 0) {
						this._currentPageIndex = this._lastPageIndex;
					}
					else {
						this._currentPageIndex--;
					}
				}
				break;
			}

			case this._emojis.next: {
				if (!this._circular) {
					if (this._currentPageIndex === this._lastPageIndex) return;
					this._currentPageIndex++;
				}
				else {
					if (this._currentPageIndex === this._lastPageIndex) {
						this._currentPageIndex = 0;
					}
					else {
						this._currentPageIndex++;
					}
				}
				break;
			}

			case this._emojis.stop: {
				this.destroy();
				return;
			}

			case this._emojis.trash: {
				this.destroy();
				await this._message!.delete();
				return;
			}

			case this._emojis.info: {
				const msg = await this._message!.channel.send(this._infoOptions.text);
				await msg.delete({ timeout: this._infoOptions.timeout });
				return;
			}

			case this._emojis.jump: {
				const promptMessage = this._jumpOptions.showPrompt
					? await this._message!.channel.send(this._jumpOptions.prompt)
					: null;

				const collected = await this._message!.channel.awaitMessages(
					x => x.author.id === this._userID,
					{ max: 1, time: this._jumpOptions.timeout }
				);

				if (promptMessage !== null) await promptMessage.delete();
				if (collected.size === 0) return;

				const collectedMessage = collected.first()!;
				const pageNumber = parseInt(collectedMessage.content);

				if (Number.isNaN(pageNumber)) return;
				if (pageNumber <= 0 || pageNumber > this._pageCount) return;
				if (this._jumpOptions.deleteResponse && hasManageMessages) await collectedMessage.delete();

				this._currentPageIndex = pageNumber - 1;
				break;
			}
		}

		await this._editMessage();
	}

	private _onEnd(): void {
		this._running = false;

		if (!this.destroyed) {
			if (this._deleteOnTimeout) this._message!.delete();
			this.emit("end", "Paginator timed out.");
		}
	}
}

export interface Paginator {
	on(event: "end", listener: (reason: string) => void): this;
	on(event: "error", listener: (error: Error | TypeError) => void): this;

	once(event: "end", listener: (reason: string) => void): this;
	once(event: "error", listener: (error: Error | TypeError) => void): this;

	off(event: "end", listener: (reason: string) => void): this;
	off(event: "error", listener: (error: Error | TypeError) => void): this;

	emit(event: "end", reason: string): boolean;
	emit(event: "error", error: Error | TypeError): boolean;
}