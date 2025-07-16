import { Sequelize, DataTypes, QueryTypes } from 'sequelize';
import * as types from './types';
import fs from 'fs';

const { mariadbDbName, mariadbUser, mariadbPass } = JSON.parse(fs.readFileSync('../../config.json', 'utf-8')) as { mariadbDbName: string, mariadbUser: string, mariadbPass: string };

export const sequelize = new Sequelize(mariadbDbName, mariadbUser, mariadbPass, {
    host: 'localhost',
    dialect: 'mariadb',
    logging: false,
    dialectOptions: {
        useUTC: false,
        dateStrings: false,
        typeCast: true,
        multipleStatements: true
    },
    timezone: 'Europe/Zurich',
    pool: {
        max: 15
    },
    query: {
        raw: true
    }
});

export const Users = sequelize.define<types.Users>('users', {
    id: {
        type: DataTypes.STRING(),
        primaryKey: true,
    },
    last_used_emoji: {
        type: DataTypes.DATE(),
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
    timestamps: false,
});

export const BannedEmojis = sequelize.define<types.BannedEmojis>('banned_emojis', {
    id: {
        type: DataTypes.STRING(),
        primaryKey: true
    }
}, {
    timestamps: false
});

void sequelize.sync({ alter: true, logging: true });
