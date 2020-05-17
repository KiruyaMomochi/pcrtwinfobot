import { JSDOM } from 'jsdom';
import { HEADERS, API_SERVER, TELEGRAPH_TOKEN } from 'config';
import { childrenToNodes, createTelegraphPage } from 'telegraph';
import axios from 'axios';
import { TelegraphArticle } from 'typings';

const INFORMATION_URL = API_SERVER + '/information/detail/';
const AJAX_ANNOUNCE = API_SERVER + '/information/ajax_announce';

async function uplaodStringToTelegraph(information: string): Promise<TelegraphArticle> {
    const document = new JSDOM(information).window.document;
    const children = document.getElementsByClassName('messages')[0].children;
    const nodes = childrenToNodes(children);

    const title = document.getElementsByClassName('title')[0].innerHTML;
    if (!nodes.length) {
        throw 'ARTICLE_NOT_EXIST';
    }

    const page = await createTelegraphPage(
        TELEGRAPH_TOKEN,
        title,
        JSON.stringify(nodes)
    );

    return page;
}

export async function uploadIdToTelegraph(id: number): Promise<TelegraphArticle> {
    const response = await axios.get(INFORMATION_URL + id, {
        headers: HEADERS
    });

    const result = await uplaodStringToTelegraph(response.data);
    return result;
}

export function getAnnounceData(offset = 0): Promise<Array<number>> {
    return axios.get(AJAX_ANNOUNCE, { params: { offset: offset }, headers: HEADERS })
        .then((response) => response.data.announce_list)
        .then((list) => list.map((i: { announce_id: number }) => i.announce_id));
}

export async function getAllArticles(): Promise<Array<number>> {
    let ids: Array<number> = [];
    let offset = 0;
    let data = await getAnnounceData(offset);
    while (data.length) {
        ids = ids.concat(data);
        offset += 10;
        data = await getAnnounceData(offset);
    }

    return ids.reverse();
}
