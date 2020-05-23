import { API_SERVER } from '../config.json';
import { promises as fs } from 'fs';

type State = Record<string, unknown>;
type StatesDict = Record<string, State>;

export function getLatestState(api = API_SERVER, field: string): Promise<unknown> {
    return fs.readFile(`states/${field}.json`, 'utf-8')
        .then(JSON.parse)
        .then((state: State) => state[api]);
}

export function setLatestState(api = API_SERVER, field: string, value: unknown): Promise<void> {
    return fs.readFile(`states/${field}.json`, 'utf-8')
        .then(JSON.parse)
        .then((state: State) => {
            state[api] = value;
            return state;
        })
        .then((obj) => JSON.stringify(obj, undefined, 2))
        .then((json) => fs.writeFile(`states/${field}.json`, json, 'utf-8'));
}
