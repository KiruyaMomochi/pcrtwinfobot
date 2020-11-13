import Telegraf from 'telegraf';
import { Db as Mongodb } from 'mongodb';

import { Redive } from './redive';
import { Telegraph } from './telegraph';
import { dateDiffInDays, sleep } from './utils';

import { ChatID, CartoonConfig, ArticleConfig, NewsConfig } from '../typings/config';
import { PCRContext } from '../typings/bot';
import { Article, Tag, Announce } from '../typings/article';
import { Cartoon as Cartoon } from '../typings/cartoon';
import { Message } from 'telegraf/typings/telegram-types';
import { News, NewsItem, NewsRetriver } from './news';

function toTagString(tag?: Tag | string, extendTag?: string[]): string {
    const tags = new Set([tag, ...extendTag ?? []]);
    let taginfo = '';
    for (const tag of tags) {
        taginfo = taginfo + '#' + tag + ' ';
    }
    taginfo = taginfo.trim();
    if (taginfo != '') {
        taginfo += '\n';
    }
    return taginfo;
}

export class PCRInfo {
    readonly statusChannel: ChatID;
    readonly cartoonConfig: CartoonConfig;
    readonly articleConfig: ArticleConfig;
    readonly newsConfig: NewsConfig;

    constructor(
        readonly bot: Telegraf<PCRContext>,
        readonly db: Mongodb,
        readonly telegraph: Telegraph
    ) {
        this.statusChannel = bot.context.config.debug.channel;
        this.cartoonConfig = bot.context.config.api.cartoon;
        this.articleConfig = bot.context.config.api.article;
        this.newsConfig = bot.context.config.news;
    }

    /**
     * Publish article id to the channel
     * @param id the article id
     * @param channel the channel id or username
     */
    async publishArticle(
        api: Redive,
        id: number,
        channel: ChatID
    ): Promise<Article> {
        const article = await api.getArticleById(id);
        const page = await this.telegraph.uploadChildren(article.title, article.content);
        const taginfo = toTagString(article.tag ? this.articleConfig.taglist[article.tag] : undefined, article.extendTag);
        const datestr = article.date.toLocaleString('zh-TW', { hour12: false });

        // send message
        await this.bot.telegram.sendMessage(channel,
            `${taginfo}<b>${article.title.replace(/^【(.+)】/, '')}</b>\n${page.url}\n${datestr}\t<code>#${id}</code>`,
            {
                parse_mode: 'HTML'
            });

        // return the article
        return article;
    }

    /**
     * Publish cartoon to the channel
     * @param cartoon the cartoon objectr
     * @param channel the channel id or username
     */
    async publishCartoon(
        api: Redive,
        cartoon: Cartoon,
        channel: ChatID
    ): Promise<Cartoon> {
        const url = await api.getCartoonById(cartoon.id);

        await this.bot.telegram.sendPhoto(
            channel,
            url,
            {
                caption: `<b>第 ${cartoon.episode} 話</b>: ${cartoon.title}\n${url}`,
                parse_mode: 'HTML'
            });

        return cartoon;
    }


    /**
     * Publish cartoon to the channel
     * @param cartoon the cartoon objectr
     * @param channel the channel id or username
     */
    async publishNews(
        newsapi: NewsRetriver,
        item: NewsItem,
        channel: ChatID
    ): Promise<News> {
        const news = await newsapi.getNews(item);
        const page = await this.telegraph.uploadElement(news.title, news.content);
        const taginfo = toTagString(news.categoryName, news.extendtag);
        const datestr = news.publishDate?.toLocaleString('zh-TW', { hour12: false });

        // send message
        await this.bot.telegram.sendMessage(channel,
            `${taginfo}<b>${news.title.replace(/^【(.+)】/, '')}</b>\n${page.url}\n${datestr}\t<code>News#${item.id}</code>`,
            {
                parse_mode: 'HTML'
            });

        // return the article
        return news;
    }

    async sendStatus(
        message: string,
        statusChannel: ChatID = this.statusChannel
    ): Promise<Message> {
        const msg = await this.bot.telegram.sendMessage(
            statusChannel,
            message,
            {
                parse_mode: 'HTML'
            }
        );
        return msg;
    }

    async getNewArticlesAndPublish(
        api: Redive,
        channel: ChatID = this.articleConfig.channel,
        minid = this.articleConfig.minid,
        skip = this.articleConfig.skip,
        delay = this.articleConfig.delay
    ): Promise<Article[]> {
        const newarts = await this.getNewArticles(api, minid, skip);
        const collection = this.db.collection('articles');
        const rets: Article[] = [];

        for (const announce of newarts) {
            const ret = await this.publishArticle(api, announce.announce_id, channel);
            await collection.insertOne(announce);
            rets.push(ret);
            await sleep(delay);
        }

        return rets;
    }

    async getNewCartoonsAndPublish(
        api: Redive,
        channel: ChatID = this.cartoonConfig.channel,
        minid = this.cartoonConfig.minid,
        skip = this.cartoonConfig.skip,
        delay = this.cartoonConfig.delay
    ): Promise<Cartoon[]> {
        const newcars = await this.getNewCartoons(api, minid, skip);
        const collection = this.db.collection('cartoons');
        const rets: Cartoon[] = [];

        for (const cartoon of newcars) {
            const ret = await this.publishCartoon(api, cartoon, channel);
            await collection.insertOne(cartoon);
            rets.push(ret);
            await sleep(delay);
        }

        return rets;
    }

    async getNewNewsAndPublish(
        newsapi: NewsRetriver,
        channel: ChatID = this.newsConfig.channel,
        minid = this.newsConfig.minid,
        skip = this.newsConfig.skip,
        delay = this.newsConfig.delay
    ): Promise<News[]> {
        const newnews = await this.getNewNews(newsapi, minid, skip);
        const collection = this.db.collection('news');
        const rets: News[] = [];

        for (const news of newnews) {
            const ret = await this.publishNews(newsapi, news, channel);
            await collection.insertOne(news);
            rets.push(ret);
            await sleep(delay);
        }

        return rets;
    }

    private async getNewArticles(
        api: Redive, minid: number, skip: number): Promise<Announce[]> {
        let cnt = 0;
        const newarts: Announce[] = [];
        const collection = this.db.collection('articles');

        for await (const announce of api.makeAnnounceIterator()) {
            const findResult = await collection.findOne({
                announce_id: announce.announce_id,
                replace_time: announce.replace_time
            });
            let findNews: NewsItem | null = null;

            cnt++;

            console.log(announce.title.title);
            if (findResult == null) {
                const res = await this.db.collection('news').findOne(
                    { 'title': announce.title.title }
                ) as NewsItem | null;
                console.log('dup news:');
                console.log(res);
                if (res && res.publishDate && dateDiffInDays(res.publishDate, new Date(announce.replace_time)) < 1) {
                    findNews = res;
                }
            }

            if (findResult == null && findNews == null && announce.announce_id >= minid) {
                cnt = 0;
                newarts.push(announce);
            }

            if (cnt >= skip) {
                break;
            }
        }

        return newarts.reverse();
    }

    private async getNewCartoons(
        api: Redive, minid: number, lenskp: number): Promise<Cartoon[]> {
        let cnt = 0;
        const newcars: Cartoon[] = [];
        const collection = this.db.collection('cartoons');

        for await (const cartoon of api.makeCartoonIterator()) {
            const findResult = await collection.findOne({
                id: cartoon.id,
                episode: cartoon.episode,
                title: cartoon.title
            });

            cnt++;

            if (findResult == null && Number(cartoon.id) >= minid) {
                cnt = 0;
                newcars.push(cartoon);
            }

            if (cnt >= lenskp) {
                break;
            }
        }

        return newcars.reverse();
    }


    private async getNewNews(
        newsapi: NewsRetriver, minid: number, lenskp: number): Promise<NewsItem[]> {
        let cnt = 0;
        const newnews: NewsItem[] = [];
        const collection = this.db.collection('news');

        for await (const news of newsapi.makeNewsItemIterator()) {
            const findResult = await collection.findOne({
                id: news.id,
                title: news.title,
                publishDate: news.publishDate
            });
            let findArticle: Announce | null = null;

            cnt++;

            console.log(news.title);
            if (findResult == null) {
                const res = await this.db.collection('articles').findOne(
                    { 'title.title': news.title }
                ) as Announce | null;
                console.log('dup art:');
                console.log(res);
                res && news.publishDate && console.log(dateDiffInDays(new Date(res.replace_time * 1000), news.publishDate));
                if (res && news.publishDate && dateDiffInDays(new Date(res.replace_time * 1000), news.publishDate) < 1) {
                    findArticle = res;
                }
            }
            
            if (findResult == null && findArticle == null && Number(news.id) >= minid) {
                cnt = 0;
                newnews.push(news);
            }

            if (cnt >= lenskp) {
                break;
            }
        }
        
        return newnews.reverse();
    }
}
