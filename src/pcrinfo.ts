import { Redive } from './redive';
import { Telegraph } from './telegraph';
import Telegraf from 'telegraf';
import { TelegrafContext } from 'telegraf/typings/context';
import { Cartoon } from '../typings/cartoon';
import { Article, Tag, Announce } from '../typings/article';
import { Db } from 'mongodb';
import { sleep } from './utils';
import { Message } from 'telegraf/typings/telegram-types';

export class PCRInfo {
    constructor(
        readonly redive: Redive,
        readonly bot: Telegraf<TelegrafContext>,
        readonly db: Db,
        readonly telegraph: Telegraph,
        readonly delay: {
            redive: number;
            telegram: {
                article: number,
                cartoon: number
            };
        },
        readonly channel: {
            article: string | number,
            cartoon: string | number,
            status: string | number,
        },
        readonly skip: {
            article: number,
            cartoon: number
        }
    ) {
    }

    static taglist: Record<Tag, string> = {
        'activity': '活動',
        'gotcha': '轉蛋',
        'special': '特別活動',
        'update': '更新',
        'maintaince': '維護',
        'info': '最新情報',
        'statement': '問題說明'
    };
    
    static titletag: [string | RegExp, string][] = [
        ['精選轉蛋', '精選轉蛋'],
        ['★3必中白金轉蛋', '必中白金'],
        ['獎勵轉蛋', '獎勵轉蛋'],
        ['戰隊競賽', '戰隊競賽'],
        ['露娜之塔', '露娜之塔'],
        ['外掛停權', '外掛停權'],
        ['公會小屋', '公會小屋'],
        ['大師商店', '大師商店'],
        ['停機維護', '停機維護'],
        ['復刻', '復刻'],
        ['探索', '探索'],
        ['地下城', '地下城'],
        ['登入送', '登入送'],
        ['劇情活動', '劇情活動'],
        ['補償', '補償'],
        ['聖跡調査', '調査'],
        ['神殿調査', '調査'],
        ['組合包', '組合包'],
        ['增量包', '增量包'],
        ['大師硬幣', '大師硬幣'],
        ['支線劇情', '支線劇情'],
        ['體力加倍', '體力加倍'],
        [/免費\d+連?抽/, '免費抽'],
        ['2倍掉落', '2倍掉落'],
        ['3倍掉落', '3倍掉落'],
        ['落量2倍', '2倍掉落'],
        ['落量3倍', '3倍掉落'],
        ['小遊戲', '小遊戲'],
        ['公主祭典', '公主祭典']
    ]

    async publishArticle(
        id: number
    ): Promise<Article> {
        const article = await this.redive.getArticleById(id);
        const page = await this.telegraph.uploadChildren(article.title, article.content);

        let tags: string[] = [];

        if (article.tag) {
            tags.push(PCRInfo.taglist[article.tag]);
        }

        for (const tt of PCRInfo.titletag) {
            if (article.title.match(tt[0])) {
                tags.push(tt[1]);
            }
        }

        const artag = article.title.match('【(.+)】');
        if (artag != null) {
            tags.unshift(artag[1]);
            article.title = article.title.replace(artag[0], '');
        }
        
        tags = [...new Set(tags)];

        let taginfo = '';
        for (const tag of tags) {
            taginfo = taginfo + '#' + tag + ' ';
        }
        taginfo = taginfo.trim();
        if (taginfo != '') {
            taginfo += '\n';
        }

        const datestr = article.date.toLocaleString('zh-TW', { hour12: false });

        await this.bot.telegram.sendMessage(this.channel.article,
            `${taginfo}<b>${article.title}</b>\n${page.url}\n${datestr}\t<code>#${id}</code>`,
            {
                parse_mode: 'HTML'
            });

        return article;
    }

    async publishCartoon(
        cartoon: Cartoon
    ): Promise<Cartoon> {
        const url = await this.redive.getCartoonById(cartoon.id);

        await this.bot.telegram.sendPhoto(
            this.channel.cartoon,
            url,
            {
                caption: `<b>第 ${cartoon.episode} 話</b>: ${cartoon.title}\n${url}`,
                parse_mode: 'HTML'
            });

        return cartoon;
    }

    async sendStatus(message: string, statusChannel: string | number = this.channel.status): Promise<Message> {
        const msg = await this.bot.telegram.sendMessage(
            statusChannel,
            message,
            {
                parse_mode: 'HTML'
            }
        );
        return msg;
    }

    async getNewArticlesAndPublish(minid = 0): Promise<Article[]> {
        const newarts = await this.getNewArticles(minid, this.skip.article);
        const collection = this.db.collection('articles');
        const rets: Article[] = [];

        for (const announce of newarts) {
            const ret = await this.publishArticle(announce.announce_id);
            await collection.insertOne(announce);
            rets.push(ret);
            await sleep(this.delay.telegram.article);
        }

        return rets;
    }

    async getNewCartoonsAndPublish(minid = 0): Promise<Cartoon[]> {
        const newcars = await this.getNewCartoons(minid, this.skip.cartoon);
        console.log(newcars);
        const collection = this.db.collection('cartoons');
        const rets: Cartoon[] = [];

        for (const cartoon of newcars) {
            const ret = await this.publishCartoon(cartoon);
            await collection.insertOne(cartoon);
            rets.push(ret);
            await sleep(this.delay.telegram.cartoon);
        }

        return rets;
    }

    async getNewArticles(minid: number, lenskp: number): Promise<Announce[]> {
        let status = 'Articles: ';

        let cnt = 0;
        const newarts: Announce[] = [];
        const collection = this.db.collection('articles');

        for await (const announce of this.redive.makeAnnounceIterator()) {
            const findResult = await collection.findOne({
                announce_id: announce.announce_id,
                replace_time: announce.replace_time
            });

            cnt++;

            if (findResult == null && announce.announce_id >= minid) {
                cnt = 0;
                status += `<code>${announce.announce_id}</code> `;
                newarts.push(announce);
            }

            if (cnt >= lenskp) {
                break;
            }
        }

        status = status.trimEnd() + `\nGot ${newarts.length} articles in total.`;
        if (newarts.length != 0) {
            await this.sendStatus(status);
        }
        return newarts.reverse();
    }

    async getNewCartoons(minid: number, lenskp: number): Promise<Cartoon[]> {
        let status = 'Cartoons: ';

        let cnt = 0;
        const newcars: Cartoon[] = [];
        const collection = this.db.collection('cartoons');

        for await (const cartoon of this.redive.makeCartoonIterator()) {
            const findResult = await collection.findOne({
                id: cartoon.id,
                episode: cartoon.episode,
                title: cartoon.title
            });

            cnt++;

            if (findResult == null && Number(cartoon.id) >= minid) {
                cnt = 0;
                status += `<code>${cartoon.id}</code> `;
                newcars.push(cartoon);
            }

            if (cnt >= lenskp) {
                break;
            }
        }

        status = status.trimRight() + `\nGot ${newcars.length} cartoons in total.`;
        if (newcars.length != 0) {
            await this.sendStatus(status);
        }
        return newcars.reverse();
    }
}
