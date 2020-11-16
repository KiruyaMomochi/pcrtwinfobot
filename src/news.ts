import Axios, { AxiosInstance } from 'axios';
import { JSDOM } from 'jsdom';
import { getExtendTag } from './utils';

type CategoryClassName = 'ac01' | 'ac02' | 'ac03'

function isCategoryClassName(x: string): x is CategoryClassName {
    return ['ac01', 'ac02', 'ac03'].includes(x);
}

export interface NewsItem {
    publishDate?: Date
    categoryClassName?: CategoryClassName
    categoryName?: string
    title: string
    url: string
    id: number
}

export interface News {
    publishDate?: Date
    categoryClassName?: CategoryClassName
    categoryName?: string
    extendtag: string[]
    title: string
    content: HTMLElement
}

export class NewsRetriver {
    async news(page = 1): Promise<string> {
        return this.axios.get(`news?page=${page}`).then(x => x.data);
    }

    readonly axios: AxiosInstance;

    constructor() {
        this.axios = Axios.create({
            baseURL: 'http://www.princessconnect.so-net.tw/'
        });
    }

    static async parseNewsHtml(html: string): Promise<NewsItem[]> {
        const jsdom = new JSDOM(html);
        const artelems = jsdom.window.document.getElementsByTagName('article')[0].getElementsByTagName('dl')[0].children;

        const articles = new Array<NewsItem>();
        let tmp: {
            categoryClassName?: CategoryClassName,
            categoryName?: string,
            publishDate?: Date
        } = {};

        for (const element of artelems) {
            if (element.textContent == '尚未提供訊息') {
                return articles;
            }
            if (element.tagName == 'DT') {
                const c0 = element.children[0];
                if (isCategoryClassName(c0.className)) {
                    tmp.categoryClassName = c0.className;
                    tmp.categoryName = c0.innerHTML;
                }
                if (element.childNodes[0].textContent)
                    tmp.publishDate = new Date(element.childNodes[0].textContent);
            }
            if (element.tagName == 'DD') {
                const a = element.children[0] as HTMLAnchorElement;
                articles.push({
                    id: Number(a.href.replace('/news/newsDetail/', '')),
                    title: a.title,
                    url: a.href,
                    ...tmp
                });
                tmp = {};
            }
        }


        return articles;
    }

    async getNews(item: NewsItem): Promise<News> {
        const html = await (await this.axios.get(item.url)).data;
        return this.parseNews(html);
    }

    async getNewsByID(id: number): Promise<News> {
        const html = await (await this.axios.get(`/news/newsDetail/${id}`)).data;
        return this.parseNews(html);
    }

    async parseNews(html: string): Promise<News> {
        const jsdom = new JSDOM(html);
        const newscon = jsdom.window.document.getElementsByClassName('news_con')[0];

        const h2 = newscon.getElementsByTagName('h2')[0] as HTMLHeadingElement;
        const h3 = newscon.getElementsByTagName('h3')[0] as HTMLHeadingElement;
        const c0 = h2.children[0];

        const section = newscon.getElementsByTagName('section')[0];
        // const elem = jsdom.window.document.createElement('div');
        const firstNode = section.children[0];

        if (firstNode.nodeName == 'H4' && firstNode.innerHTML == '超異域公主連結☆Re：Dive') {
            firstNode.remove();
        }

        while (section.childNodes[0]?.nodeType == section.childNodes[0]?.TEXT_NODE
            && (section.childNodes[0] as HTMLObjectElement)?.data?.trim()?.length == 0) {
            section.childNodes[0]?.remove();
        }
        if (section.childNodes[0]?.nodeType == section.childNodes[0]?.TEXT_NODE && (section.childNodes[0] as HTMLObjectElement))
        {
            (section.childNodes[0] as HTMLObjectElement).data = (section.childNodes[0] as HTMLObjectElement).data.trim();
        }

        const news: News = {
            title: h3.textContent ?? 'No title',
            content: section,
            extendtag: h3.textContent ? getExtendTag(h3.textContent) : []
        };
        
        if (isCategoryClassName(c0.className)) {
            news.categoryClassName = c0.className;
            news.categoryName = c0.innerHTML;
        }
        if (h2.childNodes[0].textContent) {
            news.publishDate = new Date(h2.childNodes[0].textContent);
        }

        return news;
    }

    async* makeNewsItemIterator(): AsyncGenerator<NewsItem, void, undefined> {
        let page = 1;
        for (
            let news = await NewsRetriver.parseNewsHtml(await this.news(page));
            news.length != 0;) {
            yield* news;
            page++;
            news = await NewsRetriver.parseNewsHtml(await this.news(page));
        }
    }
}
