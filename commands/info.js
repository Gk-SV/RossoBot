const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('ℹ️ Información sobre Rosso Network'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0xFF1744)
            .setTitle('🔴 ROSSO NETWORK')
            .setDescription('**Sistema Anti-Cheat Avanzado para FiveM**\n\nDetección forense profunda de cheats, mod menus, ejecutores Lua y spoofers HWID.')
            .addFields(
                { name: '💰 Precio', value: '**20€** Key Lifetime', inline: true },
                { name: '🔄 Actualizaciones', value: 'Gratis de por vida', inline: true },
                { name: '🛡️ Cheats', value: '25+ detectados', inline: true },
                { name: '🌐 Web', value: 'https://tuweb.com', inline: true },
                { name: '💬 Soporte', value: '24/7', inline: true },
                { name: '📩 Comprar', value: 'Abrir ticket', inline: true }
            )
            .setFooter({ text: 'Rosso Network · El anti-cheat definitivo' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};