export interface TelegraphResult {
    path: string;
    url: string;
    title: string;
    description: string;
    content?: NodeElement;
    views: number;
    can_edit: boolean;
}

export type NodeElement = NodeObject | string | undefined
export type NodeArray = Array<NodeObject | string>

export interface NodeObject {
    tag: string;
    attrs: {
        href?: string;
        src?: string;
    };
    children: NodeArray;
}

export interface ExtraPage {
    authorName?: string;
    authorUrl?: string;
    returnContent?: boolean;
}

interface TelegraphSuccessResponse {
    ok: true;
    result: TelegraphResult;
}

interface TelegraphErrorResponse {
    ok: false;
    error: string;
}

export type TelegraphResponse =
    TelegraphSuccessResponse | TelegraphErrorResponse;
