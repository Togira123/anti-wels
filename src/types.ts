import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export type Command = {
	name: string;
	adminOnly?: boolean;
	executeSlash?(i: CommandInteraction<'cached'>): Promise<void>;
	getSlash(): SlashCommandBuilder;
};
