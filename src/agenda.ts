import Agenda from 'agenda';
import { work, workArticles, workCartoons, workNews } from '.';
import config from '../config';

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
            priority: 'low',
            concurrency: 1
        }, async () => {
            workNews();
        });

        this.agenda.define('update all', {
            priority: 'normal',
            concurrency: 1
        }, async () => {
            work();
        });

        const schdule = config.schedule;
        for await (const cron of schdule.article) {
            await this.agenda.every(cron, 'check ajax announce');                        
        }
        for await (const cron of schdule.cartoon) {
            await this.agenda.every(cron, 'check cartoon');                        
        }
        for await (const cron of schdule.news) {
            await this.agenda.every(cron, 'check news');                        
        }

        await this.agenda.now('update all');
        return this.agenda;
    }
}
