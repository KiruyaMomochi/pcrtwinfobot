import { Redive } from './redive';
import { Telegraph } from './telegraph';
import config from '../config.json';
import { Connection } from './mongo';
import { Telegraf } from 'telegraf';
import { PCRInfo } from './pcrinfo';
import { IncomingMessage, InlineKeyboardButton, Message } from 'telegraf/typings/telegram-types';
import { TelegrafContext } from 'telegraf/typings/context';
import { Schedule } from './agenda';
import { Collection } from 'mongodb';
import { Keyboard, Vote } from '../typings/index';

export const bot = new Telegraf(config.token.bot);

export async function work(): Promise<void> {
    console.log('work()');
    const client = await Connection.connectToMongo();

    try {
        const redive = new Redive(config.apiServer[0].address, config.headers, config.delay.redive);
        const telegraph = new Telegraph(config.token.telegraph);
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            redive, bot, db, telegraph, config.delay, config.channel, config.skip
        );

        const status = `Starting service.\nDatabase connection: <code>${client.isConnected()}</code>`;
        await pcrinfo.sendStatus(status);

        await Promise.allSettled([
            pcrinfo.getNewArticlesAndPublish(config.minid.article),
            pcrinfo.getNewCartoonsAndPublish(config.minid.cartoon)]);

        await pcrinfo.sendStatus('Exiting service.');
    } catch (error) {
        console.log(error);
        bot.telegram.sendMessage(config.channel.status,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
    }
}

function article(ctx: TelegrafContext) {
    console.log('/article');
    if (ctx.message == null) {
        return ctx.reply('Null message.');
    }
    if (ctx.message.text == null) {
        return ctx.reply('Null text.');
    }

    const text = ctx.message.text.split(/\s/);
    let articleid: number | undefined;
    let server: string;

    switch (text.length) {
    case 0:
        return ctx.reply('Null message.');
        break;
    case 1:
        return ctx.reply('Please tell me article ID.');
        break;
    case 2:
        articleid = Number(text[1]);
        server = config.apiServer[0].address;
        break;
    case 3:
        articleid = Number(text[2]);
        if (isNaN(Number(text[1]))) {
            try {
                new URL(text[1]);
            } catch (error) {
                return ctx.reply(`Don't know how to deal with ${text[2]}.`);
            }
            server = text[2];
        } else {
            server = config.apiServer[Number(text[1])]?.address;
        }
        break;
    default:
        return ctx.reply('Don\'t know what to do.');
        break;
    }

    if (articleid == undefined || isNaN(articleid)) {
        return ctx.reply('The article id is not a number.');
    }
    if (server == undefined) {
        return ctx.reply('The server is not vaild.');
    }

    ctx.reply(`Publishing article ${articleid} from server ${server}`);


    Connection.connectToMongo().then(
        (client) => {
            const redive = new Redive(server, config.headers, config.delay.redive);
            const telegraph = new Telegraph(config.token.telegraph);
            const db = client.db(config.mongo.dbName);
            const pcrinfo = new PCRInfo(
                redive, bot, db, telegraph, config.delay, {
                    article: (ctx.message as IncomingMessage).chat.id,
                    cartoon: (ctx.message as IncomingMessage).chat.id,
                    status: (ctx.message as IncomingMessage).chat.id
                }, config.skip
            );
            return pcrinfo.publishArticle(articleid as number);
        }
    ).catch(
        (reason) => ctx.reply(`Failed: ${reason}`)
    );
}

export function setBotCommand(bot: Telegraf<TelegrafContext>): Telegraf<TelegrafContext> {
    bot.command('work', work);
    bot.command('start', (ctx) => {
        Schedule.defineAgenda()
            .then((agenda) => agenda.start())
            .then(
                () => ctx.reply('Started.'),
                () => ctx.reply('Failed to start.')
            );
    });
    bot.command('stop', (ctx) => {
        console.log(ctx.from);
        if (ctx.from?.username == 'djeeta') {
            Schedule.agenda.stop().then(
                () => ctx.reply('Stopped.'),
                () => ctx.reply('Failed to stop.')
            );
        } else {
            ctx.reply('No permission.');
        }
    });
    bot.command('article', article);

    bot.command('test', async (ctx) => {
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
    });

    bot.on('callback_query', onCallbackQuery);
    return bot;
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
