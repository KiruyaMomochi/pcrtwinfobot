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

export class MyContext extends TelegrafContext {
    db: {
        sendArticleById: (id: number) => Promise<Message>;
        sendAllArticles: () => Promise<void>;
    }
}
