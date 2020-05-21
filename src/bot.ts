import { Telegraf } from 'telegraf';
import { MyContext } from '../typings';
import { BOT_TOKEN } from '../config.json';

export const bot = new Telegraf<MyContext>(BOT_TOKEN);
