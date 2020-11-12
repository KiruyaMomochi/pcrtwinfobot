import Axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import { AnnounceData, Announce, Article, Tag } from '../typings/article';
import { CartoonList, Cartoon, CartoonUrl } from '../typings/cartoon';
import { ApiConfig, TagMapList } from '../typings/config';
import { getExtendTag } from './utils';

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
    static readonly ajax_announce = 'information/ajax_announce';
    static readonly info_detail = 'information/detail';
    static readonly thumbnail_list = 'cartoon/thumbnail_list';
    static readonly cartoon_datail = 'cartoon/detail'
    readonly axios: AxiosInstance;
    readonly tagMap: TagMapList;

    constructor(
        config: ApiConfig,
        server: string | null = null
    ) {
        this.axios = Axios.create({
            baseURL: server ?? config.servers[0].address,
            headers: config.headers
        });
        this.tagMap = config.article.tagMap;
    }

    async announce(offset = 0): Promise<AnnounceData> {
        const response = await this.axios.get(Redive.ajax_announce, {
            params: { offset: offset }
        });

        if (response.status != 200) {
            throw `${response.status}: ${response.statusText}`;
        }

        return response.data;
    }

    async cartoonList(page = 0): Promise<CartoonList> {
        const url = Redive.thumbnail_list + '/' + String(page);
        const response = await this.axios.get(url);

        if (response.status != 200) {
            throw `${response.status}: ${response.statusText}`;
        }

        return response.data ?? [];
    }

    async getArticleById(id: number): Promise<Article> {
        const response = await this.axios.get(Redive.info_detail + '/' + String(id));

        if (response.status != 200) {
            throw `${response.status}: ${response.statusText}`;
        }

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
            extendTag: getExtendTag(title),
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
        }
    }

    async* makeAnnounceIterator(): AsyncGenerator<Announce, void, undefined> {
        let offset = 0;
        for (
            let article = await this.announce(offset);
            article.is_over_next_offset == false;
            offset = article.length,
            article = await this.announce(offset)) {
            yield* article.announce_list;
        }
    }

    async getCartoonById(id: string): Promise<CartoonUrl> {
        const url = Redive.cartoon_datail + '/' + String(id);
        const response = await this.axios.get(url);

        if (response.status != 200) {
            throw `${response.status}: ${response.statusText}`;
        }

        const document = new JSDOM(response.data).window.document;
        const img = document.getElementsByClassName('main_cartoon')[0].children[0] as HTMLImageElement;

        return img.src;
    }
}
