import { Model } from 'sequelize';

interface UserAttributes {
    id: string;
    emoji_id: string;
    last_used_emoji?: Date;
}

export interface Users extends Model<UserAttributes>,
    UserAttributes {
    createdAt?: Date;
    updatedAt?: Date;
}

interface BannedEmojisAttributes {
    id: string;
}

export interface BannedEmojis extends Model<BannedEmojisAttributes>,
    BannedEmojisAttributes {
    createdAt?: Date;
    updatedAt?: Date;
}
