import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from '../config.json';

export const bot = new Telegraf(BOT_TOKEN);
