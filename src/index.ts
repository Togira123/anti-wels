import { Client, GatewayIntentBits, MessageReaction, Options, Partials } from 'discord.js';
import fs from 'fs';
import { Users, BannedEmojis } from "./database/database";
import { Op } from "sequelize";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { executeCommand, getCommands } from './commandList';

const { token } = JSON.parse(fs.readFileSync('./config.json', 'utf-8')) as { token: string };

const botId = '1395067254885974066';

const admins = new Set(['424510595702718475']);

const commands = getCommands();

const client = new Client({
	makeCache: Options.cacheWithLimits({
		MessageManager: 20,
	}),
	partials: [Partials.Message, Partials.Reaction, Partials.Channel],
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Log in to discord
client.login(token).catch(e => console.log(e));

client.on('interactionCreate', async i => {
	try {
		if (!i.inCachedGuild()) return;
		if (i.isChatInputCommand()) {
			let name = i.commandName;
			// TODO: also support subcommand groups
			try {
				name += " " + i.options.getSubcommand();
			} catch {
				// no subcommand
			}
			executeCommand(name, i, admins);
		}
	} catch (e) { console.error(e) }
});

client.on('messageCreate', async m => {
	try {
		if (m.partial) {
			try {
				m = await m.fetch();
			} catch {
				return;
			}
		}

		const ids = [...m.content.matchAll(/<a?:\w+:(\d+)>/g)].map(m => m[1]);
		const emojis = await BannedEmojis.findAll({
			where: {
				id: {
					[Op.in]: ids
				}
			}
		});
		if (emojis.length > 0) {
			const emojiIds = emojis.map(e => e.id);
			const userData = await Users.findAll({ where: { id: m.author.id, emoji_id: { [Op.in]: emojiIds } } });
			const now = new Date();
			for (const emojiInfo of userData) {
				if (
					emojiInfo.last_used_emoji.getDate() == now.getDate()
					&& emojiInfo.last_used_emoji.getMonth() == now.getMonth()
					&& emojiInfo.last_used_emoji.getFullYear() == now.getFullYear()
				) {
					// one of the emojis in the message has already been used, delete the message
					// but do not mark other emojis as used
					await m.delete();
					return;
				}
			}
			// none of the emojis have been used on this day
			const seenEmojis = new Set<string>();
			for (const emojiInfo of userData) {
				seenEmojis.add(emojiInfo.emoji_id);
			}
			await Users.update({ last_used_emoji: new Date() }, { where: { id: m.author.id, emoji_id: { [Op.in]: Array.from(seenEmojis) } } });
			for (const usedEmoji of emojiIds) {
				if (!seenEmojis.has(usedEmoji)) {
					await Users.create({
						id: m.author.id,
						emoji_id: usedEmoji,
						last_used_emoji: new Date()
					});
				}
			}
		}
	} catch {
		// error
	}
})

client.on('messageReactionAdd', async (r, u) => {
	try {
		let reaction: MessageReaction;
		// check whether emoji is banned
		if (r.partial) {
			try {
				reaction = await r.fetch();
			} catch {
				return;
			}
		} else {
			reaction = r as MessageReaction;
		}
		const isBanned = await BannedEmojis.findByPk(reaction.emoji.id) !== null;
		if (!isBanned) {
			return;
		}
		const userData = await Users.findOne({ attributes: ['last_used_emoji'], where: { id: u.id, emoji_id: reaction.emoji.id } });
		if (userData === null) {
			// user has not used this emoji before
			await Users.create({ id: u.id, emoji_id: reaction.emoji.id, last_used_emoji: new Date() });
			return;
		}
		const now = new Date();
		if (
			userData.last_used_emoji.getDate() == now.getDate()
			&& userData.last_used_emoji.getMonth() == now.getMonth()
			&& userData.last_used_emoji.getFullYear() == now.getFullYear()
		) {
			// user has already used up daily reaction, remove reaction
			await reaction.remove();
		} else {
			await Users.update({
				last_used_emoji: new Date()
			}, {
				where: {
					id: u.id,
					emoji_id: reaction.emoji.id
				}
			});
		}
	} catch (e) {
		console.error(e);
	}
});

client.once('ready', async () => {
	console.log("Bot is ready");
	console.log('registering commands...');
	const rest = new REST({ version: '10' }).setToken(token);
	await rest.put(
		Routes.applicationCommands(botId),
		{ body: commands },
	);
	console.log('commands registered!');
});
