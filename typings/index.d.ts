import { TelegrafContext } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/telegram-types';

type NodeElement = NodeObject | string | undefined;
type NodeArray = Array<NodeObject | string>;

interface TelegraphArticle {
    path: string;
    url: string;
    title: string;
    description: string;
    content?: NodeElement;
    views: number;
    can_edit: boolean;
}

interface NodeObject {
    tag: string;
    attrs: {
        href?: string;
        src?: string;
    };
    children: NodeArray;
}

interface Article {
    title: string;
    content: HTMLCollection;
}

interface Cartoon {
    id: number;
    episode: number;
    current_page_id: number;
    page_set: number;
    title: string;
    thumbnail: string;
}

type CartoonList = Array<Cartoon>;
type CartoonUrl = string;


export class MyContext extends TelegrafContext {
    db: {
        sendArticleById: (id: number) => Promise<Message>;
        sendAllArticles: () => Promise<void>;
    }
}
