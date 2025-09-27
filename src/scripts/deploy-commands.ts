import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { config } from '../config';

interface CommandData {
    name: string;
    data: any;
}

async function deployCommands(): Promise<void> {
    const commands: any[] = [];
    const commandsPath = join(__dirname, '../commands');

    console.log('🔍 Scanning for commands...');

    if (!statSync(commandsPath).isDirectory()) {
        console.error('❌ Commands directory not found!');
        process.exit(1);
    }

    // Get all command folders
    const commandFolders = readdirSync(commandsPath).filter(folder =>
        statSync(join(commandsPath, folder)).isDirectory()
    );

    // Load commands from each folder
    for (const folder of commandFolders) {
        const folderPath = join(commandsPath, folder);
        const commandFiles = readdirSync(folderPath).filter(file =>
            file.endsWith('.js') || file.endsWith('.ts')
        );

        console.log(`📂 Loading commands from ${folder}/`);

        for (const file of commandFiles) {
            try {
                const commandPath = join(folderPath, file);
                const commandModule = await import(commandPath);
                const command = commandModule.default || commandModule;

                if (command?.data?.name) {
                    commands.push(command.data.toJSON());
                    console.log(`  ✅ Loaded: ${command.data.name}`);
                } else {
                    console.log(`  ⚠️  Skipped: ${file} (missing data or name)`);
                }
            } catch (error) {
                console.error(`  ❌ Failed to load ${file}:`, error);
            }
        }
    }

    console.log(`\n🚀 Registering ${commands.length} commands...`);

    const rest = new REST({ version: '10' }).setToken(config.token);

    try {
        // Get guild ID from command line args for guild-specific deployment
        const guildId = process.argv[2];

        if (guildId) {
            console.log(`🎯 Deploying to guild: ${guildId}`);

            await rest.put(
                Routes.applicationGuildCommands(config.clientId, guildId),
                { body: commands }
            );

            console.log(`✅ Successfully deployed ${commands.length} commands to guild ${guildId}!`);
        } else {
            console.log('🌍 Deploying globally...');

            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );

            console.log(`✅ Successfully deployed ${commands.length} commands globally!`);
            console.log('⏰ Note: Global commands may take up to 1 hour to update.');
        }

    } catch (error) {
        console.error('❌ Failed to deploy commands:', error);
        process.exit(1);
    }
}

// Handle command line arguments
function showHelp(): void {
    console.log(`
🤖 Discord Bot Command Deployment

Usage:
  npm run deploy                    # Deploy commands globally
  npm run deploy [guild_id]         # Deploy commands to specific guild
  
Examples:
  npm run deploy                    # Global deployment
  npm run deploy 123456789012345678 # Guild-specific deployment

Options:
  --help, -h                       # Show this help message

Notes:
  - Global deployment can take up to 1 hour to propagate
  - Guild deployment is instant but only affects that guild
  - Use guild deployment for testing new commands
  `);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run the deployment
deployCommands().catch(error => {
    console.error('Fatal error during deployment:', error);
    process.exit(1);
});