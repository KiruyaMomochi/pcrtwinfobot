import { TelegrafContext } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/telegram-types';

export class MyContext extends TelegrafContext {
    db: {
        sendArticleById: (id: number) => Promise<Message>;
        sendAllArticles: () => Promise<void>;
    }
}

export { TelegraphResult, NodeElement, ExtraPage, NodeArray, NodeObject, TelegraphResponse } from '../typings/telegraph';
