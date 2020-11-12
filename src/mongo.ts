import config from '../config';
import { Collection, MongoClient } from 'mongodb';
import { Keyboard, Vote } from '../typings';

const mongo = config.mongo;
export const connectionString = `mongodb://${mongo.address}:${mongo.port}`;

function newClient(): MongoClient {
    return new MongoClient(connectionString, {
        auth: {
            user: mongo.user,
            password: mongo.password
        },
        useUnifiedTopology: true
    });
}

export class Connection {
    static db?: MongoClient;
    static async connectToMongo(): Promise<MongoClient> {
        if (this.db?.isConnected()) {
            return this.db;
        }
        this.db = await newClient().connect();
        return this.db;
    }
}

export async function ensureIndex(): Promise<void> {
    const db = (await Connection.connectToMongo()).db(mongo.dbName);
    const votes: Collection<Vote> = db.collection('vote');
    const keyboards: Collection<Keyboard> = db.collection('keyboard');
    const cartoons = db.collection('cartoons');
    const articles = db.collection('articles');
    const news = db.collection('news');
    await votes.createIndexes([{
        key: {
            chat_id: 1,
            message_id: 1,
            inline_message_id: 1,
            user_id: 1
        },
        unique: true
    }, {
        key: {
            chat_id: 1,
            message_id: 1,
            inline_message_id: 1,
            data: 'hashed'
        }
    }]);
    await keyboards.createIndex({
        chat_id: 1,
        message_id: 1,
        inline_message_id: 1
    });
    await cartoons.createIndex({
        id: 1,
        episode: 1
    });
    await articles.createIndex({
        announce_id: 1,
        replace_time: 1
    });
    await news.createIndex({
        id: 1
    });
    console.log('Index created.');
}
