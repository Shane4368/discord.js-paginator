/// <reference types="node" />
import { EventEmitter } from "events";
import Discord from "discord.js";
declare type PaginatorData = {
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
declare type PaginatorEmojis = {
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
        text: string | null;
        icon_url?: string | null;
    };
    image?: {
        url: string | null;
    };
    thumbnail?: {
        url: string | null;
    };
    author?: {
        name: string | null;
        icon_url?: string | null;
        url?: string | null;
    };
    fields?: {
        name: string | null;
        value: string | null;
        inline?: boolean | null;
    }[];
}
declare class Paginator extends EventEmitter {
    running: boolean;
    destroyed: boolean;
    stoppable: boolean;
    private _emojis;
    private _circular;
    private _userID;
    private _timeout;
    private _pages;
    private _embed;
    private _embedFooterFormat;
    private _pageCount;
    private _lastPageIndex;
    private _currentPageIndex;
    private _message;
    private _collector;
    constructor(data?: Partial<PaginatorData>);
    addPage(page: string | RichEmbed): this;
    setPages(pages: Array<string | RichEmbed>): this;
    setEmojis(emojis: PaginatorEmojis): this;
    setTimeout(timeout: number): this;
    setStoppable(enable: boolean): this;
    setEmbedTemplate(embed: RichEmbed): this;
    setCircular(enable: boolean): this;
    listen(userID: string): this;
    /**
     * @param channel - The channel to create the Paginator in.
     */
    start(channel: Discord.TextBasedChannelFields): Promise<void>;
    destroy(): void;
    on(event: "end", listener: (reason: string) => void): this;
    once(event: "end", listener: (reason: string) => void): this;
    emit(event: "end", reason: string): boolean;
    private _setMessage;
    private _editMessage;
    private _formatPage;
    private _syncEmbed;
    private _validate;
    private _onReactionAdded;
    private _onEnd;
}
export default Paginator;
export { Paginator };
