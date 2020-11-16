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
                ajax.repeatEvery(cron, { timezone: 'Asia/Taipei' }).save();
            }
            for await (const cron of schdule.cartoon) {
                cartoon.repeatEvery(cron, { timezone: 'Asia/Taipei' }).save();
            }
            for await (const cron of schdule.news) {
                news.repeatEvery(cron, { timezone: 'Asia/Taipei' }).save();
            }
        } catch (error) {
            console.log(error);
        }

        return this.agenda;
    }

    static async NextRunOf(jobName: string): Promise<Date> {
        return (await this.agenda.jobs({name: jobName}, {'nextRunAt': 1}, 1))[0].attrs.nextRunAt;
    }
    
    static async NextAjax(): Promise<Date> {
        return this.NextRunOf('check ajax announce');
    }
    static async NextCartoon(): Promise<Date> {
        return this.NextRunOf('check cartoon');
    }
    static async NextNews(): Promise<Date> {
        return this.NextRunOf('check news');
    }
}
