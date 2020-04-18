"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const PaginatorEmojisDefault = {
    front: "⏮",
    rear: "⏭",
    back: "◀",
    next: "▶",
    stop: "⏹️"
};
function delay(timeout) {
    return new Promise(resolve => setTimeout(resolve, timeout));
}
class Paginator extends events_1.EventEmitter {
    constructor(data = {}) {
        super();
        this.running = false;
        this.destroyed = false;
        this.stoppable = data.stoppable || false;
        this._emojis = { ...PaginatorEmojisDefault, ...data.emojis };
        this._circular = data.circular != null ? data.circular : true;
        this._userID = data.userID || null;
        this._timeout = data.timeout || 120000;
        this._pages = data.pages || [];
        this._embed = data.embed || null;
        this._embedFooterFormat = null;
        this._pageCount = this._pages.length;
        this._lastPageIndex = this._pageCount - 1;
        this._currentPageIndex = 0;
        this._message = null;
        this._collector = null;
    }
    addPage(page) {
        this._pages.push(page);
        this._pageCount++;
        this._lastPageIndex++;
        return this;
    }
    setPages(pages) {
        this._pages = pages;
        this._pageCount = this._pages.length;
        this._lastPageIndex = this._pageCount - 1;
        return this;
    }
    setEmojis(emojis) {
        this._emojis = emojis;
        return this;
    }
    setTimeout(timeout) {
        this._timeout = timeout;
        return this;
    }
    setStoppable(enable) {
        this.stoppable = enable;
        return this;
    }
    setEmbedTemplate(embed) {
        this._embed = embed;
        return this;
    }
    setCircular(enable) {
        this._circular = enable;
        return this;
    }
    listen(userID) {
        this._userID = userID;
        return this;
    }
    /**
     * @param channel - The channel to create the Paginator in.
     */
    async start(channel) {
        if (this.running)
            return;
        this._validate();
        this.running = true;
        await this._setMessage(channel);
        const emojis = [
            this._emojis.front,
            this._emojis.back,
            this._emojis.next,
            this._emojis.rear
        ].filter(x => typeof x === "string");
        if (this.stoppable && this._emojis.stop)
            emojis.push(this._emojis.stop);
        for (const emoji of emojis) {
            await this._message.react(emoji);
            await delay(500);
        }
        const filter = (reaction, user) => emojis.includes(reaction.emoji.id || reaction.emoji.name) && user.id === this._userID;
        this._collector = this._message.createReactionCollector(filter, { time: this._timeout })
            .on("collect", (reaction, user) => this._onReactionAdded(reaction, user))
            .on("end", () => this._onEnd());
    }
    destroy() {
        this.destroyed = true;
        this._collector.stop();
        this.emit("end", "Paginator was destroyed.");
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    once(event, listener) {
        super.once(event, listener);
        return this;
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    async _setMessage(channel) {
        const page = this._pages[0];
        this._message = typeof page === "string"
            ? await channel.send(this._formatPage(page))
            : await channel.send({ embed: this._syncEmbed(page) });
    }
    async _editMessage() {
        const page = this._pages[this._currentPageIndex];
        if (typeof page === "string") {
            await this._message.edit(this._formatPage(page));
        }
        else {
            await this._message.edit({ embed: this._syncEmbed(page) });
        }
    }
    _formatPage(page) {
        return page.replace("{0}", (this._currentPageIndex + 1).toString())
            .replace("{1}", this._pageCount.toString());
    }
    _syncEmbed(embed) {
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
        if (typeof this._embedFooterFormat !== "string") {
            if (embed.footer) {
                this._embedFooterFormat = embed.footer.text;
            }
            else {
                embed.footer = { text: null };
                this._embedFooterFormat = "Page {0}/{1}";
            }
        }
        if (!embed.footer) {
            embed.footer = { text: this._embedFooterFormat };
        }
        embed.footer.text = this._embedFooterFormat
            .replace("{0}", (this._currentPageIndex + 1).toString())
            .replace("{1}", this._pageCount.toString());
        return embed;
    }
    _validate() {
        if (this.destroyed) {
            throw new Error("Tried to use Paginator after it was destroyed.");
        }
        if (this._pages.length <= 1) {
            throw new Error("More than 1 page is required for the Paginator to start.");
        }
        if (!["back", "next"].every(x => typeof this._emojis[x] === "string")) {
            throw new TypeError("emojis must have a 'back' and 'next' property of type string.");
        }
        if (typeof this._userID !== "string") {
            throw new TypeError(`userID must be a string. Received type '${typeof this._userID}'`);
        }
    }
    async _onReactionAdded(reaction, user) {
        await reaction.users.remove(user);
        switch (reaction.emoji.id || reaction.emoji.name) {
            case this._emojis.front: {
                if (this._currentPageIndex === 0)
                    return;
                this._currentPageIndex = 0;
                break;
            }
            case this._emojis.rear: {
                if (this._currentPageIndex === this._lastPageIndex)
                    return;
                this._currentPageIndex = this._lastPageIndex;
                break;
            }
            case this._emojis.back: {
                if (!this._circular) {
                    if (this._currentPageIndex === 0)
                        return;
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
                    if (this._currentPageIndex === this._lastPageIndex)
                        return;
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
    _onEnd() {
        this.running = false;
        if (!this.destroyed)
            this.emit("end", "Paginator timed out.");
    }
}
exports.Paginator = Paginator;
exports.default = Paginator;
