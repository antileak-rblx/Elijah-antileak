const express = require("express");
const fs = require("fs");

const app = express();

app.get("/whitelist", (req, res) => {
    const whitelist = JSON.parse(fs.readFileSync("whitelist.json"));
    res.json(whitelist);
});

app.listen(3000, () => {
    console.log("API running on port 3000");
});