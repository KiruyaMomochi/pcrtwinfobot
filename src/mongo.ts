import { mongo } from '../config.json';
import { MongoClient } from 'mongodb';

const url = `mongodb://${mongo.address}:${mongo.port}`;

export function newClient(): MongoClient {
    return new MongoClient(url, {
        auth: {
            user: mongo.user,
            password: mongo.password
        },
        useUnifiedTopology: true
    });

}