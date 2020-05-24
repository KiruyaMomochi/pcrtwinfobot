import { Redive } from './src/redive';
import { Telegraph } from './src/telegraph';
import { bot } from './src/bot';
import { API_SERVER } from './config.json';
import { publishLatestArticle, publishLatestCartoon, sendStatus } from './src/utils';

const redive = new Redive(API_SERVER);
const telegraph = new Telegraph();

sendStatus('Starting.');

function doPublishArticle(): void {
    publishLatestArticle(bot, redive, telegraph)
        .then((message) => {
            sendStatus(`<b>Latest Article</b>: ${message}`);
            return message;
        })
        .catch((err) => {
            console.log(err);
            sendStatus('Error catched. Exiting.');
            process.exit();
        });
}

function doPublishCartoon(): void {
    publishLatestCartoon(bot, redive)
        .then((message) => {
            sendStatus(`<b>Latest Cartoon</b>: ${message}`);
            return message;
        })
        .catch((err) => {
            console.log(err);
            sendStatus('Error catched. Exiting.');
            process.exit();
        });
}

doPublishArticle();
setInterval(doPublishArticle, 30 * 60 * 1000);
doPublishCartoon();
setInterval(doPublishCartoon, 30 * 60 * 1000);
