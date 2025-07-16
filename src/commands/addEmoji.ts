
import { BannedEmojis } from "../database/database";
import { Command } from '../types';
import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js';

const command: Command = {
	name: 'emoji restrict',
	adminOnly: true,
	async executeSlash(i: ChatInputCommandInteraction<'cached'>) {
		const id = i.options.getString("id", true);
		await BannedEmojis.findOrCreate({
			where: { id: id }
		});
		await i.reply({ content: `Successfully restricted usage of emoji with id ${id}`, flags: MessageFlags.Ephemeral });
	},
	getSlash() {
		const emoji = new SlashCommandBuilder().setName('emoji').setDescription('manage emojis');
		emoji.addSubcommand(o => o
			.setName('restrict')
			.setDescription('restrict emoji usage')
			.addStringOption(o => o
				.setName('id')
				.setDescription('The id of the emoji to restrict')
				.setRequired(true)));
		return emoji;
	}
};
export default command;
