import Agenda from 'agenda';
import { workArticles, workCartoons, workNews } from '.';

export class Schedule {
    static agenda = new Agenda();
    static async defineAgenda(): Promise<Agenda> {
        this.agenda.cancel({});

        this.agenda.define('check ajax announce', {
            priority: 'high',
            concurrency: 1
        }, async () => {
            workArticles();
        });
        this.agenda.define('check cartoon', {
            priority: 'normal',
            concurrency: 1
        }, async () => {
            workCartoons();
        });
        this.agenda.define('check news', {
            priority: 'high',
            concurrency: 1
        }, async () => {
            workNews();
        });

        await this.agenda.every('1,31 7-21 * * *', 'check ajax announce');
        await this.agenda.every('56 12 * * *', 'check ajax announce');
        await this.agenda.every('1 0-6,22-23 * * *', 'check ajax announce');

        await this.agenda.every('1,2,4,8,16 * * *', 'check cartoon');

        await this.agenda.every('1,31 7-21 * * *', 'check news');
        await this.agenda.every('56 12 * * *', 'check news');
        await this.agenda.every('1 0-6,22-23 * * *', 'check news');

        await this.agenda.now('check ajax announce');

        return this.agenda;
    }
}
