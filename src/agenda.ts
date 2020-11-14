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
        const ajax = this.agenda.create('check ajax announce');
        const cartoon = this.agenda.create('check cartoon');
        const news = this.agenda.create('check news');
        try {
            for await (const cron of schdule.article) {
                ajax.schedule(cron);
            }
            for await (const cron of schdule.cartoon) {
                cartoon.schedule(cron);
            }
            for await (const cron of schdule.news) {
                news.schedule(cron);
            }
            ajax.save();
            cartoon.save();
            news.save();
        } catch (error) {
            console.log(error);
        }

        await this.agenda.create('update all').run();
        return this.agenda;
    }
}
