const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const commands = [
    new SlashCommandBuilder()
        .setName('deobf')
        .setDescription('Deobfuscates a .lua file')
        .addAttachmentOption(option => 
            option.setName('file')
                .setDescription('Your .lua file')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.on('ready', async () => {
    console.log(`Bot ${client.user.tag} is ready!`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Slash commands successfully registered.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'deobf') {
        await interaction.deferReply(); 

        const file = interaction.options.getAttachment('file');
        if (!file.name.endsWith('.lua')) {
            return interaction.editReply('Please attach a file with the .lua extension');
        }

        const filePath = path.join(__dirname, `temp_${Date.now()}.lua`);
        
        try {
            const response = await fetch(file.url);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));

            execFile('node', ['Prometheus-Deobfuscator/bin/pdeobf.js', filePath], (error, stdout, stderr) => {
                if (error) {
                    console.error(error);
                    return interaction.editReply('Deobfuscation error. The file might be corrupted.');
                }

                interaction.editReply({ 
                    content: 'Done! Deobfuscation result:', 
                    files: [{ attachment: Buffer.from(stdout), name: 'deobfuscated.lua' }] 
                });
                
                fs.unlinkSync(filePath);
            });
        } catch (err) {
            console.error(err);
            interaction.editReply('An error occurred while downloading or processing the file.');
        }
    }
});

client.login(TOKEN);
