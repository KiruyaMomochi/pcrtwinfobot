import axios from 'axios';
import { HEADERS, API_SERVER } from '../config.json';
import { JSDOM } from 'jsdom';

interface Article {
    title: string;
    content: HTMLCollection;
}

interface Thumbnail {
    id: number;
    episode: number;
    current_page_id: number;
    page_set: number;
    title: string;
    thumbnail: string;
}

export class Redive {
    static article_list = '/information/ajax_announce';
    static detail = '/information/detail/';

    constructor(
        readonly server: string = API_SERVER,
        readonly headers = HEADERS) {

    }

    joinUrl(path: string): string {
        return this.server + path;
    }

    getLatestArticle(offset = 0): Promise<Array<number>> {
        return axios.get(this.joinUrl(Redive.article_list), {
            params: { offset: offset },
            headers: this.headers
        })
            .then((response) => response.data.announce_list)
            .then((list) => list.map((i: { announce_id: number }) => i.announce_id));
    }

    async getArticleById(id: number): Promise<Article> {
        const response = await axios.get(
            this.server + Redive.detail + String(id),
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

    async getAllArticles(): Promise<Array<number>> {
        let ids: Array<number> = [];
        let offset = 0;
        let data = await this.getLatestArticle(offset);
        while (data.length) {
            ids = ids.concat(data);
            offset += 10;
            data = await this.getLatestArticle(offset);
        }

        return ids.reverse();
    }

}
