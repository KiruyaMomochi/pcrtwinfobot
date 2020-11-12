import axios from 'axios';
import { stringify as qstringify } from 'querystring';
import { TelegraphResult, NodeElement, ExtraPage, NodeArray, NodeObject, TelegraphResponse } from '../typings/telegraph';

export class Telegraph {
    constructor(
        readonly token: string,
        readonly api: string = 'https://api.telegra.ph/createPage') {
    }

    async createPage(
        title: string,
        content: string,
        extra?: ExtraPage): Promise<TelegraphResult> {

        const postData = {
            access_token: this.token,
            title: title,
            content: content,
            author_name: extra?.authorName,
            author_url: extra?.authorUrl,
            return_content: extra?.returnContent
        };

        const response = await axios.post(
            this.api,
            qstringify(postData)
        );
        const data: TelegraphResponse = response.data;
        
        if (data.ok) {
            return data.result;
        }
        else {
            throw data.error;
        }
    }

    static domToNode(domNode: Element): NodeElement {
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
            const node = Telegraph.domToNode(child as Element);
            node && nodeElement.children.push(node);
        });

        return nodeElement;
    }

    static childrenToNodes(children: HTMLCollection): NodeArray {
        let nodeArray: NodeArray = [];
        for (const child of children) {
            const node = Telegraph.domToNode(child);
            if (node instanceof Object && 'children' in node) {
                nodeArray = nodeArray.concat(node.children);
            }
            else if (node) {
                nodeArray.push(node);
            }
        }
        return nodeArray;
    }

    async uploadNodes(title: string, nodes: NodeArray, extra?: ExtraPage):
        Promise<TelegraphResult> {
        return this.createPage(title, JSON.stringify(nodes), extra);
    }

    async uploadChildren(title: string, clooec: HTMLCollection, extra?: ExtraPage):
        Promise<TelegraphResult> {
        return this.uploadNodes(title, Telegraph.childrenToNodes(clooec), extra);
    }

    async uploadElement(title: string, element: Element, extra?: ExtraPage):
        Promise<TelegraphResult> {
        const node = Telegraph.domToNode(element);
        if (node) {
            return this.uploadNodes(title, [node], extra);
        }
        else {
            throw 'The element doesn\'t have valid content';
        }
    }
}
