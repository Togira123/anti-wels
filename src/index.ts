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
		let userData = await Users.findByPk(m.author.id);
		if (userData === null) {
			// user not found
			userData = await Users.create({ id: m.author.id, last_used_emoji: new Date(0) });
		}
		const ids = [...m.content.matchAll(/<a?:\w+:(\d+)>/g)].map(m => m[1]);
		const count = await BannedEmojis.count({
			where: {
				id: {
					[Op.in]: ids
				}
			}
		});
		if (count > 0) {
			const now = new Date();
			if (
				userData.last_used_emoji.getDate() == now.getDate()
				&& userData.last_used_emoji.getMonth() == now.getMonth()
				&& userData.last_used_emoji.getFullYear() == now.getFullYear()
			) {
				await m.delete();
			} else {
				await Users.update({
					last_used_emoji: new Date()
				}, {
					where: {
						id: m.author.id
					}
				});
			}
		}
	} catch {
		// error
	}
})

client.on('messageReactionAdd', async (r, u) => {
	try {
		let reaction: MessageReaction;
		let userData = await Users.findByPk(u.id);
		if (userData === null) {
			// user not found
			userData = await Users.create({ id: u.id, last_used_emoji: new Date(0) });
		}
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
					id: u.id
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
