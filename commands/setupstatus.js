const { SlashCommandBuilder } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { getStatus, saveStatus, buildStatusEmbed } = require('../utils/statusUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupstatus')
        .setDescription('📢 Crea el embed de estado en este canal')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal donde se mostrará el embed (opcional)')
                .setRequired(false)),

    async execute(interaction, client) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const status = getStatus();

        // Eliminar embed anterior si existe
        if (status.messageId && status.channelId) {
            try {
                const oldChannel = await client.channels.fetch(status.channelId);
                const oldMessage = await oldChannel.messages.fetch(status.messageId);
                await oldMessage.delete();
            } catch (e) {}
        }

        const embed = buildStatusEmbed(status.state, status.lastUpdate);

        try {
            const message = await targetChannel.send({ embeds: [embed] });

            status.messageId = message.id;
            status.channelId = targetChannel.id;
            saveStatus(status);

            await interaction.editReply({
                content: `✅ Embed de estado creado en ${targetChannel}\n` +
                         `Usa \`/status\` para cambiar el estado.`
            });
        } catch (e) {
            await interaction.editReply({
                content: `❌ Error al crear el embed: ${e.message}`
            });
        }
    }
};