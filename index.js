const { Client, GatewayIntentBits, Collection, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers  // ← IMPORTANTE para eventos de miembros
    ]
});

// Cargar comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`✅ Comando cargado: ${command.data.name}`);
    }
}

// Registrar slash commands
const rest = new REST({ version: '10' }).setToken(config.token);

async function registerCommands() {
    try {
        console.log(`🔄 Registrando ${commands.length} comandos...`);

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, config.guildId),
            { body: commands }
        );

        console.log(`✅ ${commands.length} comandos registrados`);
    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
}

// Bot ready
client.once('ready', async () => {
    console.log('═══════════════════════════════════════');
    console.log(`🚀 Bot online como ${client.user.tag}`);
    console.log(`📊 Servidores: ${client.guilds.cache.size}`);
    console.log('═══════════════════════════════════════');

    client.user.setPresence({
        activities: [{ name: 'Rosso Network', type: ActivityType.Watching }],
        status: 'online'
    });

    await registerCommands();

    const statusUpdater = require('./utils/statusUpdater');
    statusUpdater(client);

    const scanWatcher = require('./utils/scanWatcher');
    scanWatcher(client);
});

// Manejar comandos
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error('❌ Error ejecutando comando:', error);

        const errorMessage = {
            content: '❌ Hubo un error al ejecutar este comando.',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// ═══════════ EVENTOS DE MIEMBROS ═══════════
const { handleNewMember, handleMemberLeave } = require('./utils/welcomeHandler');

client.on('guildMemberAdd', async (member) => {
    await handleNewMember(member);
});

client.on('guildMemberRemove', async (member) => {
    await handleMemberLeave(member);
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

client.login(config.token);