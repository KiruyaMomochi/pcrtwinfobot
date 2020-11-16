function format(date: Date): string {
    const d = new Date(date);
    d.setHours(date.getHours() + 8);
    return d.toLocaleString('zh-TW', { hour12: false });
}

class Model {
    lastUpdateCartoon: Date = new Date(0)
    lastUpdateArticle: Date = new Date(0)
    lastUpdateNews: Date = new Date(0)
    nextUpdateCartoon: Date = new Date(0)
    nextUpdateArticle: Date = new Date(0)
    nextUpdateNews: Date = new Date(0)
    // databaseSize?: number

    GetStatusString(): string {
        return `<b>Last Checked</b>:
Cartoon: <code>${format(this.lastUpdateCartoon)}</code>
Article: <code>${format(this.lastUpdateArticle)}</code>
News: <code>${format(this.lastUpdateNews)}</code>

<b>Next Checkpoint</b>:
Cartoon: <code>${format(this.nextUpdateCartoon)}</code>
Article: <code>${format(this.nextUpdateArticle)}</code>
News: <code>${format(this.nextUpdateNews)}</code>`;
    }
}

const model = new Model;
export { model as Model };
