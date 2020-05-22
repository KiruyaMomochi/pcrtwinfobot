import { Redive } from './src/redive';
import { Telegraph } from './src/telegraph';
import { bot } from './src/bot';
import { API_SERVER } from './config.json';
import { publishLatestArticle, publishLatestCartoon } from './src/utils';

const redive = new Redive(API_SERVER);
const telegraph = new Telegraph();

function doPublishArticle(): void {
    publishLatestArticle(bot, redive, telegraph).then(console.log, console.log);
}

function doPublishCartoon(): void {
    publishLatestCartoon(bot, redive).then(console.log, console.log);
}

doPublishArticle();
setInterval(doPublishArticle, 30 * 60 * 1000);
doPublishCartoon();
setInterval(doPublishCartoon, 30 * 60 * 1000);
