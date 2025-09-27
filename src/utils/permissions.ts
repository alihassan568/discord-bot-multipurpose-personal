// Bot owner ID - This should be set in environment variables in production
export const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '123456789012345678';

/**
 * Check if a user is authorized to use extra owner commands
 * @param userId - The user ID to check
 * @param guildOwnerId - The guild owner ID
 * @param extraOwners - Array of extra owner user IDs (optional, fetched from DB in production)
 * @returns boolean indicating if user is authorized
 */
export async function isAuthorizedUser(userId: string, guildOwnerId: string, extraOwners: string[] = []): Promise<boolean> {
    // In production, this would fetch extra owners from database
    // For now, we'll simulate with some example IDs
    const simulatedExtraOwners = [
        '987654321098765432',
        '456789012345678901'
    ];

    return userId === BOT_OWNER_ID ||
        userId === guildOwnerId ||
        simulatedExtraOwners.includes(userId) ||
        extraOwners.includes(userId);
}

/**
 * Get all extra owners for a guild from database
 * @param guildId - The guild ID
 * @returns Array of extra owner user IDs
 */
export async function getExtraOwners(guildId: string): Promise<string[]> {
    // In production, this would query the database
    // For now, return simulated data
    return [
        '987654321098765432',
        '456789012345678901'
    ];
}

/**
 * Check authorization and send error message if unauthorized
 * @param interaction - The interaction object
 * @param guildOwnerId - The guild owner ID
 * @param commandName - Name of the command for error message
 * @returns boolean indicating if user is authorized
 */
export async function checkAuthorizationWithError(
    interaction: any,
    guildOwnerId: string,
    commandName: string = 'this command'
): Promise<boolean> {
    const extraOwners = await getExtraOwners(interaction.guildId || '');
    const isAuthorized = await isAuthorizedUser(interaction.user.id, guildOwnerId, extraOwners);

    if (!isAuthorized) {
        await interaction.reply({
            embeds: [{
                color: 0xff0000,
                title: '🚫 Access Denied',
                description: `Only **authorized users** can use ${commandName}.`,
                fields: [
                    {
                        name: '👑 Authorized Users',
                        value: [
                            `• **Bot Owner:** <@${BOT_OWNER_ID}>`,
                            `• **Server Owner:** <@${guildOwnerId}>`,
                            `• **Extra Owners:** ${extraOwners.length > 0 ? extraOwners.map(id => `<@${id}>`).join(', ') : 'None set'}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '💡 How to Get Access',
                        value: extraOwners.length < 3
                            ? 'The Server Owner or Bot Owner can add you as an Extra Owner using `/set-extraowner add`'
                            : 'Contact the Server Owner or Bot Owner for access. Maximum extra owners (3) already set.',
                        inline: false
                    }
                ]
            }],
            ephemeral: true,
        });
    }

    return isAuthorized;
}