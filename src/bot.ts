import { Redive } from './redive';
import { Telegraph } from './telegraph';
import { Connection } from './mongo';
import { Telegraf } from 'telegraf';
import { PCRInfo } from './pcrinfo';
import { InlineKeyboardButton, Message } from 'telegraf/typings/telegram-types';
import { TelegrafContext } from 'telegraf/typings/context';
import { Schedule } from './agenda';
import { Collection } from 'mongodb';
import { Keyboard, Vote } from '../typings';
import { work } from '.';
import { PCRContext } from '../typings/bot';
import config from '../config';

export const bot = new Telegraf<PCRContext>(config.bot.token);
bot.context.config = config;

function article(ctx: PCRContext) {
    // check if message or text is null
    if (ctx.message == null) {
        return ctx.reply('Null message.');
    }
    if (ctx.message.text == null) {
        return ctx.reply('Null text.');
    }
    
    // find articleid and server
    const ret = parseText(ctx.message.text);
    if (ret == undefined) {
        return;
    }
    const [articleid, server] = ret;

    // double check
    if (articleid == undefined || isNaN(articleid)) {
        return ctx.reply('The article id is not a number.');
    }
    if (server == undefined) {
        return ctx.reply('The server is not vaild.');
    }

    // reply status
    ctx.reply(`Publishing article ${articleid} from server ${server}`);

    function parseText(msg:string): [number, string] | void {
        // split text
        const text = msg.split(/\s/);
        let articleid: number;
        let server: string;
        
        switch (text.length) {
        case 0:
            ctx.reply('Null message.');
            return;
        case 1:
            ctx.reply('Please tell me article ID.');
            return;
        case 2:
            // /article 955
            articleid = Number(text[1]);
            server = config.api.servers[0].address;
            break;
        case 3:
            articleid = Number(text[2]);
            if (isNaN(Number(text[1]))) {
                // /article [url] 955
                try {
                    new URL(text[1]);
                } catch (error) {
                    ctx.reply(`Don't know how to deal with ${text[2]}.`);
                    return;
                }
                server = text[1];
            } else {
                // /article 0 955
                server = config.api.servers[Number(text[1])]?.address;
            }
            break;
        default:
            ctx.reply('Don\'t know what to do.');
            return;
        }
        return [articleid, server];
    }

    Connection.connectToMongo().then(
        (client) => {
            const telegraph = new Telegraph(config.telegraph.token);
            const db = client.db(config.mongo.dbName);
            const pcrinfo = new PCRInfo(
                bot, db, telegraph
            );
            if(ctx.message)
                return pcrinfo.publishArticle(new Redive(config.api, server), articleid as number, ctx.message?.chat.id);
        }
    ).catch(
        (reason) => ctx.reply(`Failed: ${reason}`)
    );
}

export function setBotCommand(bot: Telegraf<PCRContext>): Telegraf<PCRContext> {
    bot.command('work', work);
    bot.command('start', start);
    bot.command('stop', stop);
    bot.command('article', article);
    bot.command('test', test);
    bot.on('callback_query', onCallbackQuery);
    return bot;
}

async function test(ctx: TelegrafContext) {
    const db = (await Connection.connectToMongo()).db(config.mongo.dbName);
    const keyboards: Collection<Keyboard> = db.collection('keyboard');

    if (ctx.message?.text == null) {
        return ctx.answerCbQuery('Null text.');
    }
    const text = ctx.message.text.split(/\s/);
    text.shift();
    const keyboard: InlineKeyboardButton[][] = [
        text.map((txt) => ({
            text: txt + ' 0',
            callback_data: txt
        }))
    ];
    ctx.telegram.sendMessage('@pcrtwstat', '測試喵', {
        reply_markup: {
            inline_keyboard: keyboard
        },
        disable_notification: true
    }).then((msg) => {
        keyboards.insertOne({
            chat_id: msg.chat.id,
            message_id: msg.message_id,
            keyboard: keyboard
        });
    });
}

async function start(ctx: TelegrafContext) {
    Schedule.defineAgenda()
        .then((agenda) => agenda.start())
        .then(
            () => ctx.reply('Started.'),
            () => ctx.reply('Failed to start.')
        );
}


async function stop(ctx: TelegrafContext) {
    console.log(ctx.from);
    if (ctx.from?.username == 'djeeta') {
        Schedule.agenda.stop().then(
            () => ctx.reply('Stopped.'),
            () => ctx.reply('Failed to stop.')
        );
    } else {
        ctx.reply('No permission.');
    }
}

async function onCallbackQuery(ctx: TelegrafContext) {
    // TODO: use inline_message_id
    const db = (await Connection.connectToMongo()).db(config.mongo.dbName);
    const votes: Collection<Vote> = db.collection('vote');
    const keyboards: Collection<Keyboard> = db.collection('keyboard');
    let message = '';

    if (ctx.callbackQuery == null) {
        return ctx.answerCbQuery('Null query.');
    }
    const callbackQuery = ctx.callbackQuery;
    if (callbackQuery.message == null && callbackQuery.inline_message_id == null) {
        return ctx.answerCbQuery('Null message.');
    }

    const result = await votes.findOneAndUpdate({
        message_id: callbackQuery.message?.message_id,
        chat_id: callbackQuery.message?.chat.id,
        inline_message_id: callbackQuery.inline_message_id,
        user_id: ctx.callbackQuery.from.id
    }, { $set: { data: ctx.callbackQuery.data } }, {
        upsert: true
    });

    if (result.ok != 1) {
        console.log(result.lastErrorObject);
        return ctx.answerCbQuery(`Failed. Code: ${result.ok}`);
    }

    if (result.value != null) {
        message = `${result.value.data} -1 `;
        if (result.value.data == callbackQuery.data) {
            votes.deleteOne(result.value);
        } else {
            message += `${callbackQuery.data} +1 `;
        }
    } else {
        message += `${callbackQuery.data} +1 `;
    }

    const query = await keyboards.findOne({
        chat_id: callbackQuery.message?.chat.id,
        message_id: callbackQuery.message?.message_id,
        inline_message_id: callbackQuery.inline_message_id
    });
    if (query == null) {
        return ctx.answerCbQuery('Null keyboard.');
    }

    await setKeyboards(query.keyboard, votes, {
        message: callbackQuery.message,
        inline_message_id: callbackQuery.inline_message_id
    })
        .catch((err) => ctx.answerCbQuery(`Failed: ${err}`));

    ctx.editMessageReplyMarkup({ inline_keyboard: query.keyboard });
    return ctx.answerCbQuery('Success. ' + message, false);
}

async function setKeyboards(keyboard: InlineKeyboardButton[][], votes: Collection<Vote>, extra: {
    message?: Message,
    inline_message_id?: string
}) {
    const message = extra.message;
    for (const keys of keyboard) {
        const promises = keys.map(async (key) => {
            const data = key.callback_data;
            if (data == undefined) {
                return;
            }
            // TODO: async it!
            const num = await votes.countDocuments({
                chat_id: message?.chat.id,
                message_id: message?.message_id,
                inline_message_id: extra.inline_message_id,
                data: data
            });
            key.text = key.callback_data + ' ' + String(num);
        });
        await Promise.allSettled(promises);
    }
}
