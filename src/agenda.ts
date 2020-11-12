import Agenda from 'agenda';
import { work } from '.';

export class Schedule {
    static agenda = new Agenda();
    static async defineAgenda(): Promise<Agenda> {
        this.agenda.cancel({});
        this.agenda.define('check ajax announce',{
            priority: 'high',
            concurrency: 1
        }, async () => {
            work();
        });
        await this.agenda.every('2,32 * * * *', 'check ajax announce');
        await this.agenda.now('check ajax announce');
        return this.agenda;
    }
}
