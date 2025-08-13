require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const mysql = require('mysql2/promise');

// Cek versi Discord.js
const discordJsVersion = require('discord.js').version;
console.log(`Discord.js version: ${discordJsVersion}`);
if (discordJsVersion.split('.')[0] < 14) {
    console.error('Discord.js versi 14 atau lebih baru diperlukan untuk modal!');
    process.exit(1);
}

// Koneksi MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Intents yang dibutuhkan
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Saat bot ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Registrasi slash command global (atau per guild untuk testing)
    const commands = [
        new SlashCommandBuilder()
            .setName('handleregist')
            .setDescription('Munculkan panel registrasi UCP'),
    ];

    client.application.commands.set(commands)
        .then(() => console.log('Slash commands registered!'))
        .catch(console.error);
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    console.log(`Menerima command: ${interaction.commandName}`);

    if (interaction.commandName === 'handleregist') {
        // Buat embed dengan banner dan header
        const embed = new EmbedBuilder()
            .setColor('#FFFFFF') // Warna putih
            .setTitle('Panel Registrasi UCP')
            .setAuthor({
                name: 'UCP Management System',
                iconURL: 'https://cdn.discordapp.com/attachments/1405035182783987817/1405138888170799124/bg1.jpg?ex=689dbd11&is=689c6b91&hm=96bbafb2ed61077066839a513bdfde41e693dedeac2069f5c151761fb8b24c78&',
            })
            .setDescription('Selamat datang di panel UCP! Pilih tombol di bawah untuk action yang diinginkan:')
            .addFields(
                { name: 'Register UCP', value: 'Daftarkan akun UCP baru untuk akses server.' },
                { name: 'Check UCP', value: 'Cek status akun UCP kamu.' },
                { name: 'Reset Password', value: 'Reset password akun UCP jika lupa.' },
                { name: 'Reverify', value: 'Verifikasi ulang akun jika ada masalah.' }
            )
            .setImage('https://cdn.discordapp.com/attachments/1405035182783987817/1405138389484834846/gta.jpg?ex=689dbc9a&is=689c6b1a&hm=c3837ca06fce5137f33b426ff242b0489dd00952a121c7a864e71b41a4b5a8a0&')
            .setFooter({ text: '©️ Martin' });

        // Buat buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('register_ucp')
                    .setLabel('👤 Register UCP')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('check_ucp')
                    .setLabel('⚠️ Check UCP')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('reset_password')
                    .setLabel('🔒 Reset Password')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('reverify')
                    .setLabel('✅ Reverify')
                    .setStyle(ButtonStyle.Success)
            );

        // Kirim embed dengan buttons
        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// Handle button interactions dan modal submissions
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const userDiscordId = interaction.user.id;
        console.log(`Button diklik: ${interaction.customId} oleh user ${userDiscordId}`);

        if (interaction.customId === 'register_ucp') {
            // Buat modal untuk input Nama UCP
            const modal = new ModalBuilder()
                .setCustomId('register_ucp_modal')
                .setTitle('Registrasi UCP');

            // Input field untuk Nama UCP
            const ucpNameInput = new TextInputBuilder()
                .setCustomId('ucp_name')
                .setLabel('Masukkan Nama UCP')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            // Tambahkan input ke modal
            const actionRow = new ActionRowBuilder().addComponents(ucpNameInput);
            modal.addComponents(actionRow);

            // Tampilkan modal
            console.log('Menampilkan modal untuk Register UCP');
            await interaction.showModal(modal);
        } else {
            // Handle button lain (Check UCP, Reset Password, Reverify)
            try {
                const connection = await pool.getConnection();

                switch (interaction.customId) {
                    case 'check_ucp':
                        const [rows] = await connection.query('SELECT * FROM users WHERE discord_id = ?', [userDiscordId]);
                        let responseEmbed;
                        if (rows.length > 0) {
                            const user = rows[0];
                            responseEmbed = new EmbedBuilder()
                                .setColor('#FFFFFF') // Warna putih
                                .setTitle('Status Akun UCP')
                                .setAuthor({
                                    name: 'UCP Management System',
                                    iconURL: 'https://cdn.discordapp.com/attachments/1405035182783987817/1405138888170799124/bg1.jpg?ex=689dbd11&is=689c6b91&hm=96bbafb2ed61077066839a513bdfde41e693dedeac2069f5c151761fb8b24c78&',
                                })
                                .addFields(
                                    { name: 'Nama UCP', value: user.ucp_username || 'Tidak ada', inline: true },
                                    { name: 'Status Verifikasi', value: user.verified ? 'Terverifikasi' : 'Belum Terverifikasi', inline: true },
                                    { name: 'Tanggal Registrasi', value: new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }
                                )
                                .setFooter({ text: '©️ Martin' });
                        } else {
                            responseEmbed = new EmbedBuilder()
                                .setColor('#FFFFFF') // Warna putih
                                .setTitle('Status Akun UCP')
                                .setDescription('Akun UCP tidak ditemukan untuk Discord ID ini.')
                                .setFooter({ text: '©️ Martin' });
                        }
                        connection.release();
                        await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
                        break;

                    case 'reset_password':
                        await connection.query('UPDATE users SET password_hash = ?, verified = 0 WHERE discord_id = ?', ['', userDiscordId]);
                        await interaction.reply({ content: 'Password berhasil direset!', ephemeral: true });
                        connection.release();
                        break;

                    case 'reverify':
                        await connection.query('UPDATE users SET verified = TRUE WHERE discord_id = ?', [userDiscordId]);
                        await interaction.reply({ content: 'Akun berhasil diverifikasi ulang!', ephemeral: true });
                        connection.release();
                        break;
                }
            } catch (error) {
                console.error('Error saat mengakses database:', error);
                await interaction.reply({ content: 'Terjadi error saat mengakses database!', ephemeral: true });
            }
        }
    } else if (interaction.isModalSubmit()) {
        // Handle submit modal
        if (interaction.customId === 'register_ucp_modal') {
            const ucpName = interaction.fields.getTextInputValue('ucp_name');
            const userDiscordId = interaction.user.id;
            console.log(`Modal disubmit: Nama UCP = ${ucpName}, Discord ID = ${userDiscordId}`);

            try {
                const connection = await pool.getConnection();

                // Cek apakah discord_id sudah terdaftar
                const [existing] = await connection.query('SELECT * FROM users WHERE discord_id = ?', [userDiscordId]);
                if (existing.length > 0) {
                    connection.release();
                    await interaction.reply({ content: 'Akun Discord ini sudah terdaftar dengan UCP!', ephemeral: true });
                    console.log(`Registrasi ditolak: Discord ID ${userDiscordId} sudah terdaftar.`);
                    return;
                }

                // Simpan data ke database
                await connection.query(
                    'INSERT INTO users (discord_id, ucp_username, verified) VALUES (?, ?, ?)',
                    [userDiscordId, ucpName, false]
                );
                connection.release();
                await interaction.reply({ content: `Registrasi UCP berhasil! Nama UCP: ${ucpName} telah disimpan.`, ephemeral: true });
                console.log(`Registrasi berhasil: Nama UCP = ${ucpName}, Discord ID = ${userDiscordId}`);
            } catch (error) {
                console.error('Error saat menyimpan ke database:', error);
                await interaction.reply({ content: 'Terjadi error saat menyimpan data ke database!', ephemeral: true });
            }
        }
    }
});

// Login bot
client.login(process.env.DISCORD_TOKEN);