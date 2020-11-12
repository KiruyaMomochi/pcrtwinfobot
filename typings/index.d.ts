import { TelegrafContext } from 'telegraf/typings/context';
import { InlineKeyboardButton } from 'telegraf/typings/telegram-types';
import { Message } from 'telegraf/typings/telegram-types';

export class MyContext extends TelegrafContext {
    db: {
        sendArticleById: (id: number) => Promise<Message>;
        sendAllArticles: () => Promise<void>;
    } | undefined
}

export interface Vote {
    user_id: number,
    chat_id?: number,
    message_id?: number,
    inline_message_id?: string,
    data: string
}

export interface Keyboard {
    message_id?: number,
    chat_id?: number,
    inline_message_id?: string,
    keyboard: Array<Array<InlineKeyboardButton>>
}

// export type Vote = any;
export { TelegraphResult, NodeElement, ExtraPage, NodeArray, NodeObject, TelegraphResponse } from './telegraph';
