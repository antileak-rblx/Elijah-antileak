const { Client, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let whitelist = [];

if (fs.existsSync("./whitelist.json")) {
    whitelist = JSON.parse(fs.readFileSync("./whitelist.json", "utf8"));
}

function saveWhitelist() {
    fs.writeFileSync("./whitelist.json", JSON.stringify(whitelist, null, 4));
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === "!add") {
        const username = args[0];

        if (!username)
            return message.reply("Usage: !add <username>");

        if (!whitelist.includes(username)) {
            whitelist.push(username);
            saveWhitelist();
        }

        message.reply(`✅ Added **${username}** to the whitelist.`);
    }

    if (command === "!remove") {
        const username = args[0];

        whitelist = whitelist.filter(name => name !== username);
        saveWhitelist();

        message.reply(`🗑️ Removed **${username}** from the whitelist.`);
    }

    if (command === "!list") {
        if (whitelist.length === 0)
            return message.reply("Whitelist is empty.");

        message.reply("Whitelisted players:\n" + whitelist.join("\n"));
    }
});

client.login(config.token);