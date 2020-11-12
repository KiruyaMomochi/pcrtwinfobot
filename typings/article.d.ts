export interface Announce {
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

export type AnnounceList = Array<Announce>;

export interface AnnounceData {
    announce_list: AnnounceList;
    per_page: number;
    base_url: string;
    total_rows: number;
    offset: number;
    is_over_next_offset: boolean;
    length: number;
}

export type Tag = 'activity' | 'gotcha' | 'special' | 'update' | 'maintaince' | 'info' | 'statement'

export interface Article {
    tag?: Tag;
    extendTag?: string[];
    title: string;
    date: Date;
    content: HTMLCollection;
}
