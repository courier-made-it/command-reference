import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";
import { InteractionCommand } from "lib/command";
import { EmbedColor } from "lib/config";
import { LevelModel } from "models/Level";
import { levelToXp, setRoles, xpToLevel } from "lib/xp";

export const resetServerConfirmButtonId = "resetServerConfirm";

const description = "Manages the leveling system for this guild.";

const xp: InteractionCommand = {
    data: new SlashCommandBuilder()
        .addSubcommandGroup(group =>
            group
                .addSubcommand(subcmd =>
                    subcmd
                        .addUserOption(option =>
                            option
                                .setRequired(true)
                                .setName("member")
                                .setDescription("The target member.")
                        )
                        .setName("user")
                        .setDescription("Resets the user's level.")
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .setName("server")
                        .setDescription("Resets the entire server's levels.")
                )
                .setName("reset")
                .setDescription("Resets the target's level.")
        )
        .addSubcommandGroup(group =>
            group
                .addSubcommand(subcmd =>
                    subcmd
                        .addUserOption(option =>
                            option
                                .setRequired(true)
                                .setName("member")
                                .setDescription("The target member.")
                        )
                        .addIntegerOption(option =>
                            option
                                .setRequired(true)
                                .setName("level")
                                .setDescription("The new level.")
                        )
                        .setName("level")
                        .setDescription("Changes the user's level.")
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .addUserOption(option =>
                            option
                                .setRequired(true)
                                .setName("member")
                                .setDescription("The target member.")
                        )
                        .addIntegerOption(option =>
                            option
                                .setRequired(true)
                                .setName("xp")
                                .setDescription("The new XP amount.")
                        )
                        .setName("xp")
                        .setDescription("Changes the user's XP.")
                )
                .setName("set")
                .setDescription("Changes the user's level or XP.")
        )
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setName("xp")
        .setDescription(description),
    exec: async (client, interaction) => {
        if (!(interaction instanceof ChatInputCommandInteraction)) {
            return { error: "Invalid Interaction Type" };
        }

        const group = interaction.options.getSubcommandGroup(true);
        const subcmd = interaction.options.getSubcommand();

        if (group == "reset") {
            if (subcmd == "user") {
                const member = interaction.options.getMember("member");

                if (!member) {
                    return {
                        error: "User is not a member of this guild>",
                        ephemeral: true,
                    };
                }

                await LevelModel.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: member.id },
                    { $unset: { cachedLevel: 0, xp: 0 } },
                    { upsert: true }
                );

                await setRoles(member, 0, interaction.settings);

                return {
                    embeds: [client.simpleEmbed({
                        description: `Reset ${member}'s XP`,
                        color: EmbedColor.Neutral
                    })]
                };
            } else if (subcmd == "server") {
                const components = [new ActionRowBuilder<ButtonBuilder>().setComponents(
                    new ButtonBuilder()
                        .setCustomId(resetServerConfirmButtonId)
                        .setLabel("Confirm")
                        .setStyle(ButtonStyle.Danger)
                )];

                return {
                    embeds: [client.simpleEmbed({
                        description: ":warning: You are about the reset the levels of every member. **Continue?**",
                        footer: "This action cannot be undone",
                        color: EmbedColor.Error,
                    })],
                    components,
                    ephemeral: true
                };
            }
        } else if (group == "set") {
            const member = interaction.options.getMember("member");

            if (!member) {
                return {
                    error: "User is not a member of this guild",
                    ephemeral: true,
                };
            }

            if (subcmd == "level") {
                const level = interaction.options.getInteger("level", true);

                await LevelModel.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: member.id },
                    { cachedLevel: level, xp: levelToXp(level) },
                    { upsert: true }
                );

                await setRoles(member, level, interaction.settings);

                return {
                    embeds: [client.simpleEmbed({
                        description: `Set ${member}'s level to ${level}`,
                        color: EmbedColor.Neutral,
                    })]
                };
            } else if (subcmd == "xp") {
                const xp = interaction.options.getInteger("xp", true);

                await LevelModel.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: member.id },
                    { cachedLevel: xpToLevel(xp), xp },
                    { upsert: true }
                );

                await setRoles(member, xpToLevel(xp), interaction.settings);

                return {
                    embeds: [client.simpleEmbed({
                        description: `Set ${member}'s XP to ${xp}`,
                        color: EmbedColor.Neutral,
                    })]
                };
            }
        }

        return { error: "Unknown Error", ephemeral: true };
    },
    help: {
        subcommands: [
            "reset user",
            "reset role",
            "set level",
            "set xp",
        ],
        description,
        category: "Management"
    }
};

export default xp;