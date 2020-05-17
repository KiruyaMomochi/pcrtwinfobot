import { Telegraf } from 'telegraf';
import { Message } from 'telegraf/typings/telegram-types';
import { uploadIdToTelegraph, getAllArticles } from 'information';
import { MyContext } from 'typings';
import { BOT_TOKEN, CHANNEL } from 'config';

const bot = new Telegraf<MyContext>(BOT_TOKEN);

async function sendArticleById(id: number): Promise<Message> {
    const url = await uploadIdToTelegraph(id);
    return bot.telegram.sendMessage(CHANNEL,
        `<b>${url.title}</b>\n${url.url}`,
        {
            // eslint-disable-next-line @typescript-eslint/camelcase
            parse_mode: 'HTML'
        });
}

async function sendAllArticles(): Promise<void> {
    const arts = await getAllArticles();
    console.log(arts);
    const timeout = 5000;
    for (const art of arts) {
        await sendArticleById(art);
        await new Promise(resolve => setTimeout(resolve, timeout));
    }
}

bot.context.db = {
    sendArticleById: sendArticleById,
    sendAllArticles: sendAllArticles
};
