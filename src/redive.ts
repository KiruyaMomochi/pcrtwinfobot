import axios from 'axios';
import { HEADERS, API_SERVER, DELAY } from '../config.json';
import { JSDOM } from 'jsdom';
import { sleep } from './utils';
import { CartoonList, CartoonUrl, Article, Cartoon } from '../typings';

export class Redive {
    static article_list = '/information/ajax_announce';
    static info_detail = '/information/detail/';
    static thumbnail_list = '/cartoon/thumbnail_list/';
    static cartoon_datail = '/cartoon/detail/'

    constructor(
        readonly server = API_SERVER,
        readonly headers = HEADERS,
        readonly delay = DELAY) {

    }

    joinUrl(path: string): string {
        return this.server + path;
    }

    getLatestArticleIds(offset = 0): Promise<Array<number>> {
        return axios.get(this.joinUrl(Redive.article_list), {
            params: { offset: offset },
            headers: this.headers
        })
            .then((response) => response.data.announce_list)
            .then((list) => list.map((i: { announce_id: number }) => i.announce_id));
    }

    async getArticleById(id: number): Promise<Article> {
        const response = await axios.get(
            this.server + Redive.info_detail + String(id),
            { headers: this.headers });

        const document = new JSDOM(response.data).window.document;
        const children = document.getElementsByClassName('messages')[0].children;

        const title = document.getElementsByClassName('title')[0].innerHTML;
        if (!children.length) {
            throw 'ARTICLE_NOT_EXIST';
        }

        return {
            title: title,
            content: children
        };
    }

    async getAllArticleIds(): Promise<Array<number>> {
        let ids: Array<number> = [];
        let offset = 0;
        let data = await this.getLatestArticleIds(offset);
        while (data.length) {
            await sleep(this.delay);
            ids = ids.concat(data);
            offset += 10;
            data = await this.getLatestArticleIds(offset);
        }

        return ids.reverse();
    }

    async getLatestCartoons(page = 0): Promise<CartoonList> {
        const url = this.joinUrl(Redive.thumbnail_list + String(page));
        const response = await axios.get(url, { headers: this.headers });

        return response.data ?? [];
    }

    async* makeCartoonIterator(): AsyncGenerator<Cartoon, void, undefined> {
        let page = 0;
        for (
            let cartoon = await this.getLatestCartoons(page);
            cartoon.length != 0;
            page++, cartoon = await this.getLatestCartoons(page)) {
            yield* cartoon;
        }
    }

    async* makeArticleIdIterator(): AsyncGenerator<number, void, undefined> {
        let offset = 0;
        for (
            let article = await this.getLatestArticleIds(offset);
            article.length != 0;
            offset += article.length, 
            article = await this.getLatestArticleIds(offset)) {
            yield* article;
        }
    }

    async getCartoonsAfter(id: number, delay: number = DELAY): Promise<CartoonList> {
        const cartoonit = this.makeCartoonIterator();
        const result: CartoonList = [];
        for await (const cartoon of cartoonit) {
            if (cartoon.id == id) {
                break;
            }
            result.unshift(cartoon);
            await sleep(delay);
        }
        return result;
    }

    async getArticleIdsAfter(id: number, delay: number = DELAY): Promise<number[]> {
        const articleit = this.makeArticleIdIterator();
        const result: number[] = [];
        for await (const article of articleit) {
            if (article == id) {
                break;
            }
            result.unshift(article);
            await sleep(delay);
        }
        return result;
    }

    async getAllCartoonIds(): Promise<CartoonList> {
        let cartoonList: CartoonList = [];
        let page = 0;

        for (
            let listInPage = await this.getLatestCartoons(page);
            listInPage.length != 0;
            page++, listInPage = await this.getLatestCartoons(page)
        ) {
            cartoonList = cartoonList.concat(listInPage);
            console.log(cartoonList);
            await sleep(this.delay);
        }

        return cartoonList.reverse();
    }

    async getCartoonById(id: number): Promise<CartoonUrl> {
        const url = this.joinUrl(Redive.cartoon_datail + String(id));
        const response = await axios.get(url, { headers: this.headers });

        const document = new JSDOM(response.data).window.document;
        const img = document.getElementsByClassName('main_cartoon')[0].children[0] as HTMLImageElement;

        return img.src;
    }
}
