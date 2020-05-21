import { API_SERVER } from '../config.json';
import { promises as fs } from 'fs';

type State = Record<string, unknown>;
type StatesDict = Record<string, State>;

export function getLatestState(api = API_SERVER): Promise<State> {
    return fs.readFile('state.json', 'utf-8')
        .then(JSON.parse)
        .then((states: StatesDict) => states[api],
            () => ({}));
}


export function setLatestState(state: State, api = API_SERVER): Promise<void> {
    return fs.readFile('state.json', 'utf-8')
        .then(JSON.parse)
        .then((states: StatesDict) => {
            for (const key in state) {
                states[api][key] = state[key];
            }
            return states;
        })
        .then((obj) => JSON.stringify(obj, undefined, 2))
        .then((json) => fs.writeFile('state.json', json, 'utf-8'));
}
