import { Redive } from './redive';
import { Telegraph } from './telegraph';
import config from '../config.json';
import { newClient } from './mongo';
import { Telegraf } from 'telegraf';
import { PCRInfo } from './pcrinfo';

const bot = new Telegraf(config.token.bot);
let interval: NodeJS.Timeout | undefined = undefined;

async function work(): Promise<void> {
    const client = newClient();
    await client.connect();

    try {
        const redive = new Redive(config.apiServer, config.headers, config.delay.redive);
        const telegraph = new Telegraph(config.token.telegraph);
        const db = client.db(config.mongo.dbName);
        const pcrinfo = new PCRInfo(
            redive, bot, db, telegraph, config.delay
        );

        const status = `Starting service.\nDatabase connection: <code>${client.isConnected()}</code>`;
        await pcrinfo.sendStatus(status);

        await Promise.allSettled([
            pcrinfo.getNewArticlesAndPublish(config.minid.article),
            pcrinfo.getNewCartoonsAndPublish(config.minid.cartoon)]);

        await pcrinfo.sendStatus('Exiting service.');
    } catch (error) {
        console.log(error);
        await client.close();
    }

    await client.close();
}

function startCycle() {
    if (interval == undefined) {
        bot.telegram.sendMessage(config.channel.status, 'Setting interval.');
        interval = setInterval(work, 30 * 60 * 1000);
    }
}

function stopCycle() {
    if (interval) {
        bot.telegram.sendMessage(config.channel.status, 'Clearing interval.');
        clearInterval(interval);
        interval = undefined;
    }
}

bot.command('work', work);
bot.command('exit', () => {
    bot.telegram.sendMessage(config.channel.status, 'Exiting.').then(() => process.exit(0));
});
bot.command('start', startCycle);
bot.command('stop', stopCycle);

bot.launch();

startCycle();

process.on('SIGINT', () =>
    bot.telegram.sendMessage(config.channel.status, 'SIGINT')
        .then(() => { process.exit(); })
);
