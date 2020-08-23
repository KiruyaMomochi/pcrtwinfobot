import { Redive } from './redive';
import { Telegraph } from './telegraph';
import Telegraf from 'telegraf';
import { channel } from '../config.json';
import { TelegrafContext } from 'telegraf/typings/context';
import { Cartoon } from '../typings/cartoon';
import { Message } from 'telegraf/typings/telegram-types';
import { Article, Tag, Announce } from '../typings/article';
import { Db } from 'mongodb';
import { sleep } from './utils';

export class PCRInfo {
    constructor(
        readonly redive: Redive,
        readonly bot: Telegraf<TelegrafContext>,
        readonly db: Db,
        readonly telegraph: Telegraph,
        readonly delay: {
            redive: number;
            telegram: number;
        }
    ) {
    }

    readonly taglist: Record<Tag, string> = {
        'activity': '活動',
        'gotcha': '轉蛋',
        'special': '特別活動',
        'update': '更新',
        'maintaince': '維護',
        'info': '最新情報',
        'statement': '問題說明'
    };

    async publishArticle(
        id: number
    ): Promise<Article> {

        let status = `Publishing article #${id}.`;

        const article = await this.redive.getArticleById(id);
        status += '\nArticle received.';

        const page = await this.telegraph.uploadChildren(article.title, article.content);
        status += '\nPage uploaded to Telegraph.';

        let taginfo = '';
        if (article.tag) {
            taginfo = `#${this.taglist[article.tag]}\n`;
        }

        const datestr = article.date.toLocaleString('zh-TW', { hour12: false });

        this.bot.telegram.sendMessage(channel.article,
            `${taginfo}<b>${article.title}</b>\n${page.url}\n${datestr}`,
            {
                parse_mode: 'HTML'
            });

        status += '\nMessage sent.';
        await this.sendStatus(status);
        return article;
    }

    async publishCartoon(
        cartoon: Cartoon
    ): Promise<Cartoon> {

        let status = `Publishing cartoon #${cartoon.id}.`;

        const url = await this.redive.getCartoonById(cartoon.id);

        this.bot.telegram.sendPhoto(
            channel.cartoon,
            url,
            {
                caption: `<b>第 ${cartoon.episode} 話</b>: ${cartoon.title}\n${url}`,
                parse_mode: 'HTML'
            });

        status += '\nPhoto sent.';
        await this.sendStatus(status);
        return cartoon;
    }

    sendStatus(message: string, statusChannel: string = channel.status): Promise<Message> {
        return this.bot.telegram.sendMessage(
            statusChannel,
            message,
            {
                parse_mode: 'HTML'
            }
        );
    }

    updateStatus(message: Message, newMessage: string): Promise<boolean | Message> {
        return this.bot.telegram.editMessageText(message.chat.id,
            message.message_id,
            undefined,
            newMessage,
            {
                parse_mode: 'HTML'
            });
    }

    async getNewArticlesAndPublish(minid = 0): Promise<Article[]> {
        const newarts = (await this.getNewArticles(minid)).reverse();
        const collection = this.db.collection('articles');
        const rets: Article[] = [];

        for (const announce of newarts) {
            const ret = await this.publishArticle(announce.announce_id);
            await collection.insertOne(announce);
            rets.push(ret);
            await sleep(this.delay.telegram);
        }

        return rets;
    }

    async getNewCartoonsAndPublish(minid = 0): Promise<Cartoon[]> {
        const newcars = (await this.getNewCartoons(minid)).reverse();
        const collection = this.db.collection('cartoons');
        const rets: Cartoon[] = [];

        for (const cartoon of newcars) {
            const ret = await this.publishCartoon(cartoon);
            await collection.insertOne(cartoon);
            rets.push(ret);
            await sleep(this.delay.telegram);
        }

        return rets;
    }

    async getNewArticles(minid = 0, lenskp = 10): Promise<Announce[]> {
        let status = `Getting new articles with min id ${minid}.\n`;

        let cnt = 0;
        const newarts: Announce[] = [];
        const collection = this.db.collection('articles');
        for await (const announce of this.redive.makeAnnounceIterator()) {
            const findResult = await collection.findOne({
                announce_id: announce.announce_id,
                replace_time: announce.replace_time
            });

            if (findResult == null && announce.announce_id >= minid) {
                cnt = 0;
                status += `<code>${announce.announce_id}</code> `;
                newarts.push(announce);
            }
            else {
                cnt++;
            }

            if (cnt >= lenskp) {
                break;
            }
        }

        status = status.trimEnd() + `\nGot ${newarts.length} articles in total.`;
        await this.sendStatus(status);
        return newarts;
    }

    async getNewCartoons(minid = 0, lenskp = 10): Promise<Cartoon[]> {
        let status = `Getting new cartoons with min id ${minid}.\n`;

        let cnt = 0;
        const newcars: Cartoon[] = [];
        const collection = this.db.collection('cartoons');
        for await (const cartoon of this.redive.makeCartoonIterator()) {
            const findResult = await collection.findOne({
                id: cartoon.id,
                episode: cartoon.episode,
                title: cartoon.title
            });

            if (findResult == null && Number(cartoon.id) >= minid) {
                cnt = 0;
                status += `<code>${cartoon.id}</code> `;
                newcars.push(cartoon);
            }
            else {
                cnt++;
            }

            if (cnt >= lenskp) {
                break;
            }
        }

        status = status.trimRight() + `\nGot ${newcars.length} cartoons in total.`;
        await this.sendStatus(status);
        return newcars;
    }
}
