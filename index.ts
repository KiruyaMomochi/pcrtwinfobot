import { Redive } from './src/redive';
import { Telegraph } from './src/telegraph';
import { bot } from './src/bot';
import { getLatestState, setLatestState } from './src/state';
import { API_SERVER, CHANNEL } from './config.json';

async function publishLatestArticle(api = API_SERVER): Promise<number> {
    const redive = new Redive(api);
    const telegraph = new Telegraph();
    const state = await getLatestState(api);
    const latestArt = state['latest_announce_id'] as number;
    const announceResult = await redive.getAnnounceData();

    const newArts = announceResult.slice(undefined, announceResult.indexOf(latestArt));
    for (const id of newArts) {
        const article = await redive.getArticleById(id);
        const page = await telegraph.uploadChildren(article.title, article.content);

        bot.telegram.sendMessage(CHANNEL,
            `<b>${page.title}</b>\n${page.url}`,
            {
                // eslint-disable-next-line @typescript-eslint/camelcase
                parse_mode: 'HTML'
            });
    }

    state['latest_announce_id'] = announceResult[0];
    setLatestState(state);

    return announceResult[0];
}

function doPublishArticle(): void {
    publishLatestArticle().then(console.log, console.log);
}

doPublishArticle();
setInterval(doPublishArticle, 30 * 60 * 1000);
