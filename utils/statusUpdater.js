const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const STATUS_FILE = path.join(__dirname, '..', 'data', 'status.json');

function getStatus() {
    if (!fs.existsSync(path.dirname(STATUS_FILE))) {
        fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    }

    if (!fs.existsSync(STATUS_FILE)) {
        const defaultStatus = {
            state: 'offline',
            messageId: null,
            channelId: null,
            lastUpdate: new Date().toISOString()
        };
        fs.writeFileSync(STATUS_FILE, JSON.stringify(defaultStatus, null, 2));
        return defaultStatus;
    }
    return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
}

function saveStatus(status) {
    if (!fs.existsSync(path.dirname(STATUS_FILE))) {
        fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
    }
    fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
}

function buildStatusEmbed(state, lastUpdate) {
    const statusConfig = {
        online: {
            color: 0x00E676,
            emoji: '🟢',
            title: 'ONLINE',
            description: 'El programa está **funcionando correctamente**.\nPuedes usar Rosso Network sin problemas.',
            fields: [
                { name: '✅ Estado', value: 'Operativo', inline: true },
                { name: '🟢 Servicio', value: 'Activo', inline: true },
                { name: '📡 Conexión', value: 'Estable', inline: true }
            ]
        },
        offline: {
            color: 0xFF1744,
            emoji: '🔴',
            title: 'OFFLINE',
            description: 'El programa está **inactivo temporalmente**.\nVolverá a estar disponible pronto.',
            fields: [
                { name: '❌ Estado', value: 'Inactivo', inline: true },
                { name: '🔴 Servicio', value: 'Apagado', inline: true },
                { name: '📡 Conexión', value: 'No disponible', inline: true }
            ]
        },
        maintenance: {
            color: 0xFF9100,
            emoji: '🟡',
            title: 'MANTENIMIENTO',
            description: 'El programa está en **modo mantenimiento**.\nEstamos mejorando el sistema, volveremos pronto.',
            fields: [
                { name: '⚙️ Estado', value: 'En mantenimiento', inline: true },
                { name: '🟡 Servicio', value: 'Pausado', inline: true },
                { name: '🛠️ Acción', value: 'Mejorando', inline: true }
            ]
        }
    };

    const cfg = statusConfig[state] || statusConfig.offline;

    const embed = new EmbedBuilder()
        .setColor(cfg.color)
        .setTitle(`${cfg.emoji} ROSSO NETWORK - ${cfg.title}`)
        .setDescription(cfg.description)
        .addFields(cfg.fields)
        .addFields({
            name: '⏰ Última actualización',
            value: `<t:${Math.floor(new Date(lastUpdate).getTime() / 1000)}:R>`,
            inline: false
        })
        .setFooter({
            text: 'Rosso Network · Anti-Cheat FiveM'
        })
        .setTimestamp();

    return embed;
}

async function updateStatusEmbed(client) {
    const status = getStatus();

    if (!status.messageId || !status.channelId) return;

    try {
        const channel = await client.channels.fetch(status.channelId);
        if (!channel) return;

        const message = await channel.messages.fetch(status.messageId);
        if (!message) return;

        const embed = buildStatusEmbed(status.state, status.lastUpdate);
        await message.edit({ embeds: [embed] });
    } catch (e) {
        console.error('Error actualizando embed de status:', e.message);
    }
}

function statusUpdater(client) {
    // Actualizar cada 5 minutos para refrescar el timestamp
    setInterval(() => {
        updateStatusEmbed(client);
    }, 5 * 60 * 1000);

    setTimeout(() => updateStatusEmbed(client), 5000);
}

module.exports = statusUpdater;
module.exports.getStatus = getStatus;
module.exports.saveStatus = saveStatus;
module.exports.buildStatusEmbed = buildStatusEmbed;
module.exports.updateStatusEmbed = updateStatusEmbed;