import axios from 'axios';
import { JSDOM } from 'jsdom';
import { sleep } from './utils';
import { AnnounceData, Announce, Article, Tag } from '../typings/article';
import { CartoonList, Cartoon, CartoonUrl } from '../typings/cartoon';

const taglist: Record<number, Tag> = {
    1: 'activity',
    2: 'gotcha',
    3: 'special',
    4: 'update',
    5: 'maintaince',
    6: 'info',
    7: 'statement'
};

function classNameToTag(className: string): Tag | undefined {
    className = className.replace('icon_', '');
    return taglist[Number(className)];
}

export class Redive {
    static readonly ajax_announce = '/information/ajax_announce';
    static readonly info_detail = '/information/detail';
    static readonly thumbnail_list = '/cartoon/thumbnail_list';
    static readonly cartoon_datail = '/cartoon/detail'

    constructor(
        readonly server: string,
        readonly headers: Record<string, string>,
        readonly apiDelay: number) {
    }

    joinUrl(path: string): string {
        return this.server + path;
    }

    async announce(offset = 0): Promise<AnnounceData> {
        const response = await axios.get(this.joinUrl(Redive.ajax_announce), {
            params: { offset: offset },
            headers: this.headers
        });

        return response.data;
    }

    async cartoonList(page = 0): Promise<CartoonList> {
        const url = this.joinUrl(Redive.thumbnail_list + '/' + String(page));
        const response = await axios.get(url, { headers: this.headers });

        return response.data ?? [];
    }

    async getArticleById(id: number): Promise<Article> {
        const response = await axios.get(
            this.joinUrl(Redive.info_detail + '/' + String(id)),
            { headers: this.headers });

        const document = new JSDOM(response.data).window.document;
        const children = document.getElementsByClassName('messages')[0].children;

        const title = document.getElementsByClassName('title')[0].innerHTML.trim();
        const date = new Date(document.getElementsByClassName('date')[0].innerHTML.trim());
        const tagClass = document.getElementsByClassName('date')[0].classList[1].trim();
        if (!children.length) {
            throw 'ARTICLE_NOT_EXIST';
        }

        return {
            title: title,
            date: date,
            tag: classNameToTag(tagClass),
            content: children
        };
    }

    async* makeCartoonIterator(): AsyncGenerator<Cartoon, void, undefined> {
        let page = 0;
        for (
            let cartoon = await this.cartoonList(page);
            cartoon.length != 0;
            page++, cartoon = await this.cartoonList(page)) {
            yield* cartoon;
            await sleep(this.apiDelay);
        }
    }

    async* makeAnnounceIterator(): AsyncGenerator<Announce, void, undefined> {
        let offset = 0;
        for (
            let article = await this.announce(offset);
            article.length != 0;
            offset = article.length,
            article = await this.announce(offset)) {
            yield* article.announce_list;
            await sleep(this.apiDelay);
        }
    }

    async getCartoonById(id: string): Promise<CartoonUrl> {
        const url = this.joinUrl(Redive.cartoon_datail + '/' + String(id));
        const response = await axios.get(url, { headers: this.headers });

        const document = new JSDOM(response.data).window.document;
        const img = document.getElementsByClassName('main_cartoon')[0].children[0] as HTMLImageElement;

        return img.src;
    }
}
