import { TelegrafContext } from 'telegraf/typings/context';
import { Message } from 'telegraf/typings/telegram-types';

type NodeElement = NodeObject | string | undefined;
type NodeArray = Array<NodeObject | string>;

interface TelegraphArticle {
    path: string;
    url: string;
    title: string;
    description: string;
    content?: NodeElement;
    views: number;
    can_edit: boolean;
}

interface Announce {
    announce_id: number;
    language: number;
    category: number;
    status: number;
    platform: number;
    slider_flag: number;
    from_date: string;
    to_date: string;
    replace_time: number;
    priority: number;
    end_date_slider_image?: string;
    title: {
        title: string;
        slider_image?: string;
        thumbnail_image?: string;
        banner_ribbon: number;
    };
    link_num: number;
}

interface NodeObject {
    tag: string;
    attrs: {
        href?: string;
        src?: string;
    };
    children: NodeArray;
}

interface Article {
    title: string;
    content: HTMLCollection;
}

interface Cartoon {
    id: number;
    episode: number;
    current_page_id: number;
    page_set: number;
    title: string;
    thumbnail: string;
}

interface AnnounceData {
    announce_list: AnnounceList;
    per_page: number;
    base_url: string;
    total_rows: number;
    offset: number;
    is_over_next_offset: boolean;
    length: number;
}

type CartoonList = Array<Cartoon>;
type CartoonUrl = string;

type AnnounceList = Array<Announce>;

export class MyContext extends TelegrafContext {
    db: {
        sendArticleById: (id: number) => Promise<Message>;
        sendAllArticles: () => Promise<void>;
    }
}
