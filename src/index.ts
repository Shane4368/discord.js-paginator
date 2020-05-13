import { EventEmitter } from "events";
import {
	Message,
	MessageReaction,
	ReactionCollector,
	TextBasedChannelFields,
	User
} from "discord.js";

type PaginatorData = {

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
	 * The pages to use in the paginator. Must be 2 or more pages.
	 */
	pages: Array<string | MessageEmbed>;

	/**
	 * If set to `true`, the paginator will include the stop emoji.
	 * @default false
	 */
	stoppable: boolean;

	/**
	 * If set to `true`, the pages will loop on 'back' and 'next.'
	 * @default true
	 */
	circular: boolean;
};

type PaginatorEmojis = {

	/** @default "⏮" */
	front?: string | null;

	/** @default "⏭" */
	rear?: string | null;

	/** @default "◀" */
	back: string;

	/** @default "▶" */
	next: string;

	/** @default "⏹️" */
	stop?: string | null;
};

interface PaginatorEvents {
	end: [string];
	error: [Error];
}

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

const PaginatorEmojisDefault: Readonly<PaginatorEmojis> = {
	front: "⏮",
	rear: "⏭",
	back: "◀",
	next: "▶",
	stop: "⏹️"
};

function delay(timeout: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, timeout));
}

export class Paginator extends EventEmitter {
	public destroyed: boolean;

	private static readonly _footerFormat = "Page {0}/{1}";

	private _collector: ReactionCollector | null = null;
	private _embedFooterFormat: string | null = null;
	private _message: Message | null = null;
	private _currentPageIndex = 0;
	private _running = false;

	private _circular: boolean;
	private _embed: MessageEmbed | null;
	private _emojis: PaginatorEmojis;
	private _pages: Array<string | MessageEmbed>;
	private _stoppable: boolean;
	private _timeout: number;
	private _userID: string | null;
	private _pageCount: number;
	private _lastPageIndex: number;

	public constructor(data: Partial<PaginatorData> = {}) {
		super();

		const {
			circular = true,
			embed = null,
			emojis = null,
			pages = [],
			stoppable = false,
			timeout = 120000,
			userID = null
		} = data;

		this.destroyed = false;

		this._circular = circular;
		this._embed = embed;
		this._emojis = { ...PaginatorEmojisDefault, ...emojis };
		this._pages = pages;
		this._stoppable = stoppable;
		this._timeout = timeout;
		this._userID = userID;
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

	public setTimeout(timeout: number): this {
		this._timeout = timeout;
		return this;
	}

	public setStoppable(stoppable: boolean): this {
		this._stoppable = stoppable;
		return this;
	}

	public setEmbedTemplate(embed: MessageEmbed): this {
		this._embed = embed;
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

		const emojis = [
			this._emojis.front,
			this._emojis.back,
			this._emojis.next,
			this._emojis.rear
		].filter(x => typeof x === "string");

		if (this._stoppable && this._emojis.stop) emojis.push(this._emojis.stop);

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

	public on<K extends keyof PaginatorEvents>(event: K, listener: (...args: PaginatorEvents[K]) => void): this;
	public on(event: string | symbol, listener: (...args: any[]) => void): this {
		super.on(event, listener);
		return this;
	}

	public once<K extends keyof PaginatorEvents>(event: K, listener: (...args: PaginatorEvents[K]) => void): this;
	public once(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		return this;
	}

	public emit<K extends keyof PaginatorEvents>(event: K, ...args: PaginatorEvents[K]): boolean;
	public emit(event: string | symbol, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

	private async _setMessage(channel: TextBasedChannelFields): Promise<void> {
		const page = this._pages[0];

		this._message = typeof page === "string"
			? await channel.send(this._renderPageNumber(page))
			: await channel.send({ embed: this._mergeEmbedTemplate(page) });
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

		if (!(this._pages instanceof Array)) {
			this.emit("error", new TypeError(`pages must be an array. Received type '${typeof this._emojis}.'`));
			return false;
		}

		if (this._pages.length <= 1) {
			this.emit("error", new Error("Paginator must have more than 1 page."));
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

		return true;
	}

	private async _onReactionAdded(reaction: MessageReaction, user: User): Promise<void> {
		await reaction.users.remove(user);

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
		}

		await this._editMessage();
	}

	private _onEnd(): void {
		this._running = false;

		if (!this.destroyed) this.emit("end", "Paginator timed out.");
	}
}