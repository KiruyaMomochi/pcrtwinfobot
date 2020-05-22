import { getLatestState, setLatestState } from './state';
import { Redive } from './redive';
import { Telegraph } from './telegraph';
import Telegraf from 'telegraf';
import { INFO_CHANNEL, CARTOON_CHANNEL, DELAY } from '../config.json';
import { TelegrafContext } from 'telegraf/typings/context';
import { Cartoon, CartoonList } from '../typings';

export function sleep(ms: number): Promise<unknown> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function publishArticleById(
    id: number,
    bot: Telegraf<TelegrafContext>,
    redive: Redive,
    telegraph: Telegraph
): Promise<void> {
    const article = await redive.getArticleById(id);
    const page = await telegraph.uploadChildren(article.title, article.content);

    bot.telegram.sendMessage(INFO_CHANNEL,
        `<b>${page.title}</b>\n${page.url}`,
        {
            // eslint-disable-next-line @typescript-eslint/camelcase
            parse_mode: 'HTML'
        });
}

export async function publishLatestArticle(
    bot: Telegraf<TelegrafContext>,
    redive: Redive,
    telegraph: Telegraph,
    delay = DELAY
): Promise<number> {
    let state = await getLatestState(redive.server);
    let latestArt = state['latest_announce_id'] as number;

    const newArts = await redive.getArticleIdsAfter(latestArt, delay);

    for (const id of newArts) {
        await publishArticleById(id, bot, redive, telegraph);
    }

    state = await getLatestState(redive.server);
    latestArt = newArts[0] ?? state['latest_announce_id'];
    state['latest_announce_id'] = latestArt;
    setLatestState(state);

    return latestArt;
}

export async function publishCartoonById(
    id: number,
    episode: number,
    title: string,
    bot: Telegraf<TelegrafContext>,
    redive: Redive
): Promise<void> {
    const url = await redive.getCartoonById(id);

    bot.telegram.sendPhoto(
        CARTOON_CHANNEL,
        url,
        {
            caption: `<b>第 ${episode} 話</b>: ${title}
${url}`,
            // eslint-disable-next-line @typescript-eslint/camelcase
            parse_mode: 'HTML'
        });
}

export async function publishCartoonByCartoon(
    cartoon: Cartoon,
    bot: Telegraf<TelegrafContext>,
    redive: Redive
): Promise<void> {
    return publishCartoonById(
        cartoon.id,
        cartoon.episode,
        cartoon.title,
        bot,
        redive
    );
}
export async function publishLatestCartoon(
    bot: Telegraf<TelegrafContext>,
    redive: Redive,
    delay = DELAY
): Promise<number> {
    let state = await getLatestState(redive.server);
    let latestCartoonId = state['latest_cartoon_id'] as number;

    const newCartoons = await redive.getCartoonsAfter(latestCartoonId, delay);

    for (const cartoon of newCartoons) {
        await publishCartoonByCartoon(cartoon, bot, redive);
    }

    state = await getLatestState(redive.server);
    latestCartoonId = newCartoons[0]?.id ?? state['latest_cartoon_id'];
    state['latest_cartoon_id'] = latestCartoonId;
    setLatestState(state);

    return latestCartoonId;
}
