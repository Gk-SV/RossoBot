const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config.json');

async function handleNewMember(member) {
    console.log(`👋 Nuevo miembro: ${member.user.tag} (${member.id})`);

    // ═══════════ 1. ASIGNAR ROL BÁSICO ═══════════
    if (config.memberRoleId) {
        try {
            const role = member.guild.roles.cache.get(config.memberRoleId);

            if (!role) {
                console.error('❌ Rol básico no encontrado. Verifica memberRoleId en config.json');
            } else {
                await member.roles.add(role);
                console.log(`✅ Rol "${role.name}" asignado a ${member.user.tag}`);
            }
        } catch (e) {
            console.error('❌ Error asignando rol:', e.message);
            console.error('   Asegúrate de que el rol del bot esté POR ENCIMA del rol que asigna');
        }
    }

    // ═══════════ 2. ENVIAR MENSAJE DE BIENVENIDA ═══════════
    if (!config.welcomeChannelId) {
        console.log('⚠️ No hay welcomeChannelId configurado');
        return;
    }

    try {
        const channel = await member.client.channels.fetch(config.welcomeChannelId);
        if (!channel) {
            console.error('❌ Canal de bienvenida no encontrado');
            return;
        }

        const memberCount = member.guild.memberCount;

        const embed = new EmbedBuilder()
            .setColor(0xFF1744)
            .setTitle('🎉 ¡BIENVENIDO A ROSSO NETWORK!')
            .setDescription(`¡Hola <@${member.id}>! 👋\n\nGracias por unirte a nuestra comunidad.\nEsperamos que disfrutes tu estancia aquí.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '👤 Usuario',
                    value: `${member.user.tag}`,
                    inline: true
                },
                {
                    name: '📊 Miembro #',
                    value: `${memberCount}`,
                    inline: true
                },
                {
                    name: '📅 Cuenta creada',
                    value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '📖 ¿Qué hacer ahora?',
                    value: '• Lee las normas del servidor\n• Mira los canales disponibles\n• ¡Diviértete con la comunidad!'
                }
            )
            .setImage('https://i.imgur.com/AfFp7pu.png') // Opcional: banner
            .setFooter({
                text: `Rosso Network · Somos ${memberCount} miembros`,
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await channel.send({
            content: `¡Bienvenido <@${member.id}>! 🔴`,
            embeds: [embed]
        });

        console.log(`✅ Mensaje de bienvenida enviado para ${member.user.tag}`);
    } catch (e) {
        console.error('❌ Error enviando bienvenida:', e.message);
    }
}

async function handleMemberLeave(member) {
    console.log(`👋 Miembro salió: ${member.user.tag} (${member.id})`);

    if (!config.welcomeChannelId) return;

    try {
        const channel = await member.client.channels.fetch(config.welcomeChannelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(0x555555)
            .setTitle('👋 Un miembro se ha ido')
            .setDescription(`**${member.user.tag}** ha abandonado el servidor.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '📊 Miembros restantes',
                    value: `${member.guild.memberCount}`,
                    inline: true
                },
                {
                    name: '⏰ Se unió',
                    value: member.joinedTimestamp
                        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                        : 'Desconocido',
                    inline: true
                }
            )
            .setFooter({
                text: 'Rosso Network',
                iconURL: member.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error('❌ Error en mensaje de despedida:', e.message);
    }
}

module.exports = {
    handleNewMember,
    handleMemberLeave
};