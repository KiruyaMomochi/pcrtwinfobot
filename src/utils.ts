import config from '../config';
import { TagMapList } from '../typings/config';

export function sleep(ms: number): Promise<unknown> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getExtendTag(title: string, tagmap: TagMapList = config.misc.tagMap): string[] {
    const tags: string[] = [];
    for (const tt of tagmap) {
        if (title.match(tt[0])) {
            tags.push(tt[1]);
        }
    }

    const artag = title.match('【(.+)】');
    if (artag != null) {
        tags.unshift(artag[1]);
    }
    
    return [...new Set(tags)];
}

// https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
const _MS_PER_DAY = 1000 * 60 * 60 * 24;
export function dateDiffInDays(a: Date, b: Date): number {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  
    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
