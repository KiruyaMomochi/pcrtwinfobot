import { getLatestState, setLatestState } from './state';
import { Redive } from './redive';
import { Telegraph } from './telegraph';
import Telegraf from 'telegraf';
import { INFO_CHANNEL, CARTOON_CHANNEL, IMAGE_DELAY, ARTICLE_DELAY } from '../config.json';
import { TelegrafContext } from 'telegraf/typings/context';
import { Cartoon } from '../typings';

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
    telegraph: Telegraph
): Promise<number> {
    const latestArt = (await getLatestState(redive.server, 'latest_announce_id')) as number;
    const newArts = await redive.getArticleIdsAfter(latestArt);

    for (const id of newArts) {
        await publishArticleById(id, bot, redive, telegraph);
        await sleep(ARTICLE_DELAY);
    }

    const newLatestArticle = Number(newArts.pop()) || latestArt;
    setLatestState(redive.server, 'latest_announce_id', newLatestArticle);
    return newLatestArticle;
}

export async function publishCartoonById(
    id: string,
    episode: string,
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
    redive: Redive
): Promise<string> {
    const latestCartoonId = (await getLatestState(redive.server, 'latest_cartoon_id')) as string;
    const newCartoons = await redive.getCartoonsAfter(latestCartoonId);

    for (const cartoon of newCartoons) {
        await publishCartoonByCartoon(cartoon, bot, redive);
        await sleep(IMAGE_DELAY);
    }
    
    const newLatestCartoonId = newCartoons.pop()?.id || latestCartoonId;
    setLatestState(redive.server, 'latest_cartoon_id', newLatestCartoonId);
    return newLatestCartoonId;
}
