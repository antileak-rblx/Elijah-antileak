const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");

const token = process.env.TOKEN;
console.log("TOKEN LOADED:", !!token);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILE_PATH = "whitelist.json";

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

async function saveWhitelist() {
    fs.writeFileSync("./whitelist.json", JSON.stringify(whitelist, null, 4));
    await pushWhitelistToGitHub();
}

async function pushWhitelistToGitHub() {
    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        console.log("⚠️ GitHub sync skipped — missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO variables.");
        return;
    }

    try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

        // Get current file SHA (required by GitHub API to update an existing file)
        const getRes = await fetch(apiUrl, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        const getData = await getRes.json();
        const sha = getData.sha;

        const content = Buffer.from(JSON.stringify(whitelist, null, 4)).toString("base64");

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update whitelist.json via bot [skip ci]",
                content: content,
                sha: sha
            })
        });

        const putData = await putRes.json();
        if (putRes.ok) {
            console.log("✅ Pushed whitelist.json to GitHub");
        } else {
            console.error("❌ GitHub push failed:", putData);
        }
    } catch (err) {
        console.error("GitHub push error:", err);
    }
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === "!add") {
        const username = args[0];

        if (!username)
            return message.reply("Usage: !add <username>");

        if (!whitelist.includes(username)) {
            whitelist.push(username);
            await saveWhitelist();
        }

        message.reply(`✅ Added **${username}** to the whitelist.`);
    }

    if (command === "!remove") {
        const username = args[0];

        whitelist = whitelist.filter(name => name !== username);
        await saveWhitelist();

        message.reply(`🗑️ Removed **${username}** from the whitelist.`);
    }

    if (command === "!list") {
        if (whitelist.length === 0)
            return message.reply("Whitelist is empty.");

        message.reply("Whitelisted players:\n" + whitelist.join("\n"));
    }
});

client.login(token)
    .then(() => console.log("Bot logged in successfully"))
    .catch(err => console.error("LOGIN ERROR:", err));

// --- HTTP server so Roblox can fetch the whitelist ---
const app = express();

app.get("/whitelist", (req, res) => {
    res.json(whitelist);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
});