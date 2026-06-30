const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${config.jsonbin.binId}`;
const ALERTED_FILE = path.join(__dirname, '..', 'data', 'alerted.json');

function getAlertedScans() {
    if (!fs.existsSync(path.dirname(ALERTED_FILE))) {
        fs.mkdirSync(path.dirname(ALERTED_FILE), { recursive: true });
    }
    if (!fs.existsSync(ALERTED_FILE)) {
        fs.writeFileSync(ALERTED_FILE, JSON.stringify([]));
        return [];
    }
    return JSON.parse(fs.readFileSync(ALERTED_FILE, 'utf8'));
}

function saveAlertedScans(scans) {
    fs.writeFileSync(ALERTED_FILE, JSON.stringify(scans, null, 2));
}

async function fetchScans() {
    try {
        const response = await fetch(`${JSONBIN_URL}/latest`, {
            headers: {
                'X-Master-Key': config.jsonbin.apiKey,
                'X-Bin-Meta': 'false'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.scans || [];
    } catch (e) {
        console.error('Error fetching scans:', e.message);
        return null;
    }
}

async function sendAlert(client, scan) {
    if (!config.alertsChannelId) {
        console.error('⚠️ No hay alertsChannelId configurado');
        return;
    }

    try {
        const channel = await client.channels.fetch(config.alertsChannelId);
        if (!channel) return;

        const threats = scan.threats || [];
        const uniqueCheats = [...new Set(threats.map(t => t.name))];
        const totalEvidence = threats.length;

        // Severity más alta
        const severities = threats.map(t => t.severity);
        const hasCritical = severities.includes('CRITICAL');
        const hasHigh = severities.includes('HIGH');

        let color = 0xFF9100;
        let severityEmoji = '⚠️';
        if (hasCritical) {
            color = 0xFF1744;
            severityEmoji = '🚨';
        } else if (hasHigh) {
            color = 0xFF5722;
            severityEmoji = '🔥';
        }

        // Construir embed
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${severityEmoji} CHEAT DETECTADO - ROSSO NETWORK`)
            .setDescription(`Se ha detectado actividad sospechosa en un escaneo.`)
            .addFields(
                { name: '👤 Usuario Escaneado', value: `\`${scan.userId || 'Desconocido'}\``, inline: true },
                { name: '💻 PC', value: `\`${scan.machineName || 'Desconocido'}\``, inline: true },
                { name: '🔑 HWID', value: `\`${scan.hardwareId || 'N/A'}\``, inline: true },
                { name: '👨‍💼 Staff', value: `\`${scan.createdBy || 'Unknown'}\``, inline: true },
                { name: '🆔 Código', value: `\`${scan.linkId || 'N/A'}\``, inline: true },
                { name: '🎮 FiveM', value: scan.fiveMInstalled ? '✅ Instalado' : '❌ No instalado', inline: true }
            );

        // Estadísticas
        embed.addFields({
            name: '📊 Estadísticas del Scan',
            value: `\`\`\`yaml\nCheats únicos: ${uniqueCheats.length}\nEvidencias: ${totalEvidence}\nArchivos analizados: ${(scan.totalFilesScanned || 0).toLocaleString()}\nDuración: ${scan.scanDuration || 'N/A'}\n\`\`\``,
            inline: false
        });

        // Listar cheats detectados (máximo 10)
        if (uniqueCheats.length > 0) {
            const grouped = {};
            threats.forEach(t => {
                if (!grouped[t.name]) grouped[t.name] = [];
                grouped[t.name].push(t);
            });

            let cheatsList = '';
            let count = 0;

            for (const name in grouped) {
                if (count >= 10) break;

                const evidences = grouped[name];
                const first = evidences[0];
                const lastRun = evidences
                    .filter(e => e.lastExecuted && e.lastExecuted !== '')
                    .sort((a, b) => new Date(b.lastExecuted) - new Date(a.lastExecuted))[0];

                const severityIcon = first.severity === 'CRITICAL' ? '🔴' :
                                    first.severity === 'HIGH' ? '🟠' :
                                    first.severity === 'MEDIUM' ? '🟡' : '⚪';

                cheatsList += `${severityIcon} **${name}**\n`;
                cheatsList += `↳ Tipo: ${first.cheatType || 'Unknown'}\n`;
                cheatsList += `↳ Evidencias: ${evidences.length}\n`;
                if (lastRun && lastRun.lastExecuted) {
                    const date = new Date(lastRun.lastExecuted);
                    cheatsList += `↳ Última ejecución: <t:${Math.floor(date.getTime() / 1000)}:R>\n`;
                }
                cheatsList += `\n`;
                count++;
            }

            if (uniqueCheats.length > 10) {
                cheatsList += `*... y ${uniqueCheats.length - 10} más*`;
            }

            embed.addFields({
                name: `🎯 Cheats Detectados (${uniqueCheats.length})`,
                value: cheatsList.substring(0, 1024),
                inline: false
            });
        }

        // Métodos de detección
        const methods = [...new Set(threats.map(t => t.detectionMethod))];
        if (methods.length > 0) {
            embed.addFields({
                name: '🔍 Métodos de Detección',
                value: methods.slice(0, 8).map(m => `• ${m}`).join('\n'),
                inline: false
            });
        }

        embed
            .setFooter({
                text: `Rosso Network · Scan ID: ${scan.linkId || 'N/A'}`
            })
            .setTimestamp(new Date(scan.scanTime || Date.now()));

        await channel.send({
            content: `🚨 **NUEVA ALERTA** · Staff: <@&${config.staffRoleIds[0]}>`,
            embeds: [embed]
        });

        console.log(`✅ Alerta enviada para scan: ${scan.linkId}`);
    } catch (e) {
        console.error('❌ Error enviando alerta:', e.message);
    }
}

async function checkForNewScans(client) {
    const scans = await fetchScans();
    if (!scans || scans.length === 0) return;

    const alerted = getAlertedScans();
    let newAlerted = [...alerted];
    let alertsSent = 0;

    for (const scan of scans) {
        // Solo alertar si tiene amenazas y no se ha alertado antes
        if (!scan.threats || scan.threats.length === 0) continue;

        const scanKey = `${scan.linkId}_${scan.scanTime}`;
        if (alerted.includes(scanKey)) continue;

        await sendAlert(client, scan);
        newAlerted.push(scanKey);
        alertsSent++;

        // Esperar un poco entre alertas para evitar rate limit
        await new Promise(r => setTimeout(r, 1000));
    }

    if (alertsSent > 0) {
        // Limitar a últimas 100 entradas
        if (newAlerted.length > 100) {
            newAlerted = newAlerted.slice(-100);
        }
        saveAlertedScans(newAlerted);
    }
}

function scanWatcher(client) {
    console.log('🔍 Scan Watcher iniciado (revisando cada 30 segundos)');

    // Revisar cada 30 segundos
    setInterval(() => {
        checkForNewScans(client);
    }, 30 * 1000);

    // Primera revisión al iniciar (después de 10 segundos)
    setTimeout(() => checkForNewScans(client), 10000);
}

module.exports = scanWatcher;