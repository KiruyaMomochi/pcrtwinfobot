import { Connection, ensureIndex } from './mongo';
import { Schedule } from './agenda';
import { bot, setBotCommand } from './bot';

(async () => {
    await Connection.connectToMongo();
    await ensureIndex();
    setBotCommand(bot);
    await bot.telegram.setWebhook('https://www.nekopara.xyz/djioajdsioa');
    bot.startWebhook('/djioajdsioa', null, 5000);
    await bot.launch();

    Schedule.agenda.mongo((await Connection.connectToMongo()).db('agenda'));
    (await Schedule.defineAgenda()).start();
})();

process.on('SIGINT', async () => {
    await Schedule.agenda.stop();
    await bot.stop();
    console.log('Bye!');
    process.exit();
});
