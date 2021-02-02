import { Connection, ensureIndex } from './mongo';
import { Schedule } from './agenda';
import { bot, setBotCommand } from './bot';
import { Redive } from './redive';
import { Telegraph } from './telegraph';
import { PCRInfo } from './pcrinfo';
import config from '../config';
import { News, NewsRetriver } from './news';
import { Cartoon } from '../typings/cartoon';
import { Article } from '../typings/article';
import { Model } from './model';

const redive = new Redive(config.api);
const telegraph = new Telegraph(config.telegraph.token);
const newsRetriver = new NewsRetriver();

export async function work(): Promise<void> {
    console.log('work()');
    const client = await Connection.connectToMongo();

    try {
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            bot, db, telegraph
        );

        const status = `Starting service.\nDatabase connection: <code>${client.isConnected()}</code>`;
        await pcrinfo.sendStatus(status);

        await Promise.allSettled([
            pcrinfo.getNewArticlesAndPublish(redive),
            pcrinfo.getNewCartoonsAndPublish(redive)]);

        await pcrinfo.getNewNewsAndPublish(newsRetriver);

        await pcrinfo.sendStatus('Exiting service.');
    } catch (error) {
        console.log(`Error in work(): ${error}`);
        bot.telegram.sendMessage(config.debug.channel,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
    }
}

export async function workArticles(): Promise<Article[] | undefined> {
    console.log('workArticles()');
    const client = await Connection.connectToMongo();
    try {
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            bot, db, telegraph
        );
        await pcrinfo.sendStatus('workArticles()');
        const arts = await pcrinfo.getNewArticlesAndPublish(redive);
        
        Model.lastUpdateArticle = new Date(Date.now());
        updateStatus();

        return arts;
    } catch (error) {
        console.log(`Error in workArticles(): ${error}`);
        bot.telegram.sendMessage(config.debug.channel,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
    }
}

export async function workCartoons(): Promise<Cartoon[] | undefined> {
    console.log('workCartoons()');
    const client = await Connection.connectToMongo();
    try {
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            bot, db, telegraph
        );
        await pcrinfo.sendStatus('workCartoons()');
        const cartoon = await pcrinfo.getNewCartoonsAndPublish(redive);
        
        Model.lastUpdateCartoon = new Date(Date.now());
        updateStatus();

        return cartoon;
    } catch (error) {
        console.log(`Error in workCartoons(): ${error}`);
        bot.telegram.sendMessage(config.debug.channel,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
    }
}

export async function workNews(): Promise<News[] | undefined> {
    console.log('workNews()');
    const client = await Connection.connectToMongo();
    try {
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            bot, db, telegraph
        );
        await pcrinfo.sendStatus('workNews()');
        const news = await pcrinfo.getNewNewsAndPublish(newsRetriver);
        
        Model.lastUpdateNews = new Date(Date.now());
        updateStatus();

        return news;
    } catch (error) {
        console.log(`Error in workNews(): ${error}`);
        bot.telegram.sendMessage(config.debug.channel,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
    }
}

let statusId: number | null;
export async function updateStatus(): Promise<void> {
    Model.nextUpdateArticle = await Schedule.NextAjax();
    Model.nextUpdateCartoon = await Schedule.NextCartoon();
    Model.nextUpdateNews = await Schedule.NextNews();

    const chatId = config.debug.channel;
    if (statusId) {
        try {
            await bot.telegram.editMessageText(chatId, statusId, undefined, Model.GetStatusString(), {parse_mode: 'HTML'});
            return;
        } catch (error) {
            statusId = null;
        }
    } else {
        const ctx = await bot.telegram.sendMessage(chatId, Model.GetStatusString(), {parse_mode: 'HTML'});
        statusId = ctx.message_id;
    }
}


(async () => {
    await Connection.connectToMongo();
    await ensureIndex();
    setBotCommand(bot);
    await bot.telegram.setWebhook('https://www.nekopara.xyz/djioajdsioa');
    bot.startWebhook('/djioajdsioa', null, 5000);
    await bot.launch();

    Schedule.agenda.mongo((await Connection.connectToMongo()).db('agenda'));
    try {
        await Schedule.agenda.start();
        await Schedule.defineAgenda();
    } catch (except) {
        console.log(`Exception: ${except}`);
    }
    
    updateStatus();
})();

process.on('SIGINT', async () => {
    await Schedule.agenda.stop();
    await bot.stop();
    console.log('Bye!');
    process.exit();
});
