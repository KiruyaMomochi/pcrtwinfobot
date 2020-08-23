export interface Cartoon {
    id: string;
    episode: string;
    current_page_id: number;
    page_set: number;
    title: string;
    thumbnail: string;
}

export type CartoonList = Array<Cartoon>;
export type CartoonUrl = string;
