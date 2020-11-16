import { Tag } from './article';

export interface Config {
    schedule: SchduleConfig
    telegraph: TelegraphConfig
    mongo: MongoConfig
    bot: BotConfig
    api: ApiConfig
    news: NewsConfig
    debug: DebugConfig
    misc: MiscConfig
}

interface ApiConfig {
    servers: ApiServer[],
    headers: HeadersConfig,
    article: ArticleConfig
    cartoon: CartoonConfig
}

interface NewsConfig {
    address: UrlString
    channel: ChatID
    minid: number
    skip: number
    delay: number
}

type TagMapList = [string | RegExp, string][];

interface ArticleConfig {
    skip: number
    minid: number
    delay: number
    channel: ChatID
    taglist: Record<Tag, string>
}

interface TelegraphConfig {
    token: TelegraphToken
}

interface CartoonConfig {
    skip: number
    minid: number
    delay: number
    channel: ChatID
}

interface DebugConfig {
    channel: ChatID
}

interface BotConfig {
    token: BotToken
    webhook?: WebhookConfig
}

interface SchduleConfig {
    article: CronTime[]
    cartoon: CronTime[]
    news: CronTime[]
    gnn: CronTime[]
    fb: CronTime[]
}

interface ChannelsConfig {
    article: ChatID
    cartoon: ChatID
    status: ChatID
}

interface MongoConfig {
    user: string
    password: string
    address: string
    port: string
    dbName: string
}

interface WebhookConfig {
    server: UrlString
    path: string
}

interface HeadersConfig {
    'user-agent': UaString
}

interface MiscConfig {
    tagMap: TagMapList
}

export interface ApiServer {
    name: string
    address: UrlString
}

export type CronTime = string
export type UrlString = string
export type UaString = string
export type BotToken = string
export type TelegraphToken = string
export type ChatID = string | number
