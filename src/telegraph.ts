/* eslint-disable @typescript-eslint/camelcase */
import axios from 'axios';
import { stringify as qstringify } from 'querystring';
import { NodeElement, NodeArray, TelegraphArticle, NodeObject } from 'typings';

export function domToNode(domNode: Element): NodeElement {
    if (domNode.nodeType == domNode.TEXT_NODE) {
        return (domNode as HTMLObjectElement).data;
    }
    if (domNode.nodeType != domNode.ELEMENT_NODE) {
        return undefined;
    }

    const nodeElement: NodeObject = {
        tag: domNode.tagName.toLowerCase(),
        attrs: {},
        children: []
    };

    for (const attr of domNode.attributes) {
        if (attr.name == 'href' || attr.name == 'src') {
            if (!nodeElement.attrs) {
                nodeElement.attrs = {};
            }
            nodeElement.attrs[attr.name] = attr.value;
        }
    }

    nodeElement.children = [];

    domNode.childNodes.forEach((child) => {
        const node = domToNode(child as Element);
        node && nodeElement.children.push(node);
    });

    return nodeElement;
}

export function childrenToNodes(children: HTMLCollection): NodeArray {
    let nodeArray: NodeArray = [];
    for (const child of children) {
        const node = domToNode(child);
        if (node instanceof Object && 'children' in node) {
            nodeArray = nodeArray.concat(node.children);
        }
        else if (node) {
            nodeArray.push(node);
        }
    }
    return nodeArray;
}

export function createTelegraphPage(
    accessToken: string,
    title: string,
    content: string,
    authorName?: string,
    authorUrl?: string,
    returnContent?: boolean): Promise<TelegraphArticle> {

    const postData = {
        access_token: accessToken,
        title: title,
        content: content,
        author_name: authorName,
        author_url: authorUrl,
        return_content: returnContent
    };

    return axios.post(
        'https://api.telegra.ph/createPage',
        qstringify(postData)
    ).then((response) => {
        const data = response.data;
        if (data.ok) {
            return data.result;
        }
        else {
            throw data.error;
        }
    });
}
