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


const redive = new Redive(config.api);
const telegraph = new Telegraph(config.telegraph.token);
const news = new NewsRetriver();

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

        await pcrinfo.getNewNewsAndPublish(news);

        await pcrinfo.sendStatus('Exiting service.');
    } catch (error) {
        console.log(error);
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
        return await pcrinfo.getNewArticlesAndPublish(redive);
    } catch (error) {
        console.log(error);
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
        return await pcrinfo.getNewCartoonsAndPublish(redive);
    } catch (error) {
        console.log(error);
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
        return await pcrinfo.getNewNewsAndPublish(news);
    } catch (error) {
        console.log(error);
        bot.telegram.sendMessage(config.debug.channel,
            `<b>Exception</b><br><code>${error}</code>`, { parse_mode: 'HTML' }
        );
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
        console.log(except);
    }
})();

process.on('SIGINT', async () => {
    await Schedule.agenda.stop();
    await bot.stop();
    console.log('Bye!');
    process.exit();
});
