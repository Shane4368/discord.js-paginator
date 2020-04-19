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
	embed: RichEmbed;

	/**
	 * The emojis to use for skipping the pages.
	 * Specify the id for custom guild emojis.
	 */
	emojis: PaginatorEmojis;

	/**
	 * The id of the user to listen to.
	 */
	userID: string;

	/**
	 * The time in milliseconds of how long to keep the paginator running.
	 * @default 120000
	 */
	timeout: number;

	/**
	 * The pages to use in the paginator. Must be 2 or more pages.
	 */
	pages: Array<string | RichEmbed>;

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

interface RichEmbed {
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

class Paginator extends EventEmitter {
	public destroyed: boolean;

	private _stoppable: boolean;
	private _emojis: PaginatorEmojis;
	private _circular: boolean;
	private _userID: string | null;
	private _timeout: number;
	private _pages: Array<string | RichEmbed>;
	private _embed: RichEmbed | null;
	private _running: boolean;
	private _embedFooterFormat: string | null;
	private _pageCount: number;
	private _lastPageIndex: number;
	private _currentPageIndex: number;
	private _message: Message | null;
	private _collector: ReactionCollector | null;

	public constructor(data: Partial<PaginatorData> = {}) {
		super();

		this.destroyed = false;

		this._stoppable = data.stoppable || false;
		this._emojis = { ...PaginatorEmojisDefault, ...data.emojis };
		this._circular = data.circular != null ? data.circular : true;
		this._userID = data.userID || null;
		this._timeout = data.timeout || 120000;
		this._pages = data.pages || [];
		this._embed = data.embed || null;

		this._running = false;
		this._embedFooterFormat = null;
		this._pageCount = this._pages.length;
		this._lastPageIndex = this._pageCount - 1;
		this._currentPageIndex = 0;
		this._message = null;
		this._collector = null;
	}

	public addPage(page: string | RichEmbed): this {
		this._pages.push(page);
		this._pageCount++;
		this._lastPageIndex++;
		return this;
	}

	public setPages(pages: Array<string | RichEmbed>): this {
		this._pages = pages;
		this._pageCount = this._pages.length;
		this._lastPageIndex = this._pageCount - 1;
		return this;
	}

	public setEmojis(emojis: PaginatorEmojis): this {
		this._emojis = emojis;
		return this;
	}

	public setTimeout(timeout: number): this {
		this._timeout = timeout;
		return this;
	}

	public setStoppable(enable: boolean): this {
		this._stoppable = enable;
		return this;
	}

	public setEmbedTemplate(embed: RichEmbed): this {
		this._embed = embed;
		return this;
	}

	public setCircular(enable: boolean): this {
		this._circular = enable;
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
		if (this._running) return;

		this._validate();
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
			await this._message!.react(emoji as string);
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

	public on(event: "end", listener: (reason: string) => void): this;
	public on(event: string | symbol, listener: (...args: any[]) => void): this {
		super.on(event, listener);
		return this;
	}

	public once(event: "end", listener: (reason: string) => void): this;
	public once(event: string | symbol, listener: (...args: any[]) => void): this {
		super.once(event, listener);
		return this;
	}

	public emit(event: "end", reason: string): boolean;
	public emit(event: string | symbol, ...args: any[]): boolean {
		return super.emit(event, ...args);
	}

	private async _setMessage(channel: TextBasedChannelFields): Promise<void> {
		const page = this._pages[0];

		this._message = typeof page === "string"
			? await channel.send(this._formatPage(page))
			: await channel.send({ embed: this._syncEmbed(page) });
	}

	private async _editMessage(): Promise<void> {
		const page = this._pages[this._currentPageIndex];

		if (typeof page === "string") {
			await this._message!.edit(this._formatPage(page));
		}
		else {
			await this._message!.edit({ embed: this._syncEmbed(page) });
		}
	}

	private _formatPage(page: string): string {
		return page.replace("{0}", (this._currentPageIndex + 1).toString())
			.replace("{1}", this._pageCount.toString());
	}

	private _syncEmbed(embed: RichEmbed): RichEmbed {
		if (this._embed !== null) {
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

		if (this._embedFooterFormat === null) {
			if (embed.footer) {
				this._embedFooterFormat = embed.footer.text as string;
			}
			else {
				embed.footer = { text: null };
				this._embedFooterFormat = "Page {0}/{1}";
			}
		}

		if (!embed.footer) {
			embed.footer = { text: this._embedFooterFormat };
		}

		embed.footer.text = (this._embedFooterFormat as string)
			.replace("{0}", (this._currentPageIndex + 1).toString())
			.replace("{1}", this._pageCount.toString());

		return embed;
	}

	private _validate(): void {
		if (this.destroyed) {
			throw new Error("Tried to use Paginator after it was destroyed.");
		}

		if (this._pages.length <= 1) {
			throw new Error("More than 1 page is required for the Paginator to start.");
		}

		if (!["back", "next"].every(x => typeof this._emojis[x as keyof PaginatorEmojis] === "string")) {
			throw new TypeError("emojis must have a 'back' and 'next' property of type string.");
		}

		if (typeof this._userID !== "string") {
			throw new TypeError(`userID must be a string. Received type '${typeof this._userID}'`);
		}
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

export { Paginator };