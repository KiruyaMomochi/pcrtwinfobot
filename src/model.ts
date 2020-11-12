class CustomDate extends Date
{
    toCustomString = () => this.toLocaleString('zh-TW', {hour12: false})
    toString = () => this.toCustomString()
}

export class Model
{
    lastUpdateCartoon:CustomDate = new CustomDate()
    lastUpdateArticle:CustomDate = new CustomDate()
    lastUpdateNews:CustomDate = new CustomDate()
    nextUpdateCartoon:CustomDate = new CustomDate()
    nextUpdateArticle:CustomDate = new CustomDate()
    nextUpdateNews:CustomDate = new CustomDate()
    databaseSize?: number

    GetStatusString(): string {
        return `Last Checked:
        Cartoon: ${this.lastUpdateCartoon}
        Article: ${this.lastUpdateArticle}
        News: ${this.lastUpdateNews}

        Next Checkpoint:
        Cartoon: ${this.nextUpdateCartoon}
        Article: ${this.nextUpdateArticle}
        News: ${this.nextUpdateNews}

        Database used: ${this.databaseSize}
        `;
    }
}
