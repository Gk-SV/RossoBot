const { SlashCommandBuilder } = require('discord.js');
const { isStaff } = require('../utils/permissions');
const { getStatus, saveStatus, updateStatusEmbed } = require('../utils/statusUpdater');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('🔄 Cambia el estado del programa Rosso Network')
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('Nuevo estado del programa')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Online', value: 'online' },
                    { name: '🔴 Offline', value: 'offline' },
                    { name: '🟡 Mantenimiento', value: 'maintenance' }
                )),

    async execute(interaction, client) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const newState = interaction.options.getString('estado');
        const status = getStatus();

        const oldState = status.state;
        status.state = newState;
        status.lastUpdate = new Date().toISOString();
        status.updatedBy = interaction.user.tag;

        saveStatus(status);

        // Actualizar embed si existe
        if (status.messageId && status.channelId) {
            await updateStatusEmbed(client);
        }

        const stateNames = {
            online: '🟢 ONLINE',
            offline: '🔴 OFFLINE',
            maintenance: '🟡 MANTENIMIENTO'
        };

        await interaction.editReply({
            content: `✅ Estado actualizado: **${stateNames[oldState] || oldState}** → **${stateNames[newState]}**\n` +
                     `${status.messageId ? '📢 El embed se actualizó automáticamente.' : '⚠️ No hay embed configurado. Usa `/setupstatus` primero.'}`
        });

        // Actualizar presencia del bot
        const presenceConfig = {
            online: { name: 'Rosso Network · ONLINE', status: 'online' },
            offline: { name: 'Rosso Network · OFFLINE', status: 'dnd' },
            maintenance: { name: 'Mantenimiento', status: 'idle' }
        };

        const presence = presenceConfig[newState];
        try {
            client.user.setPresence({
                activities: [{ name: presence.name, type: 3 }], // 3 = WATCHING
                status: presence.status
            });
        } catch (e) {}
    }
};