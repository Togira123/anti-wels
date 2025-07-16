import emojiCommand from './commands/addEmoji';
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const commands = [
	emojiCommand
];

// to add more commands simply add them to the array
export function getCommands(): SlashCommandBuilder[] {
	return commands.map(c => c.getSlash());
}

export function executeCommand(name: string, i: ChatInputCommandInteraction<'cached'>, admins: Set<string>) {
	const cmd = commands.find(c => c.name === name);
	if (!cmd) {
		throw new Error(`Command ${name} not found`);
	}
	if (!cmd.adminOnly || admins.has(i.user.id)) {
		cmd.executeSlash(i);
	}
}
