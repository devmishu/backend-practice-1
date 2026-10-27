import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

import "dotenv/config"

import { app } from "./app.js";
import connectDb from "./db/index.js";

const PORT = process.env.PORT



app.get("/", (req, res) => {
    res.json({ name: "Playzo server" })
})


connectDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on PORT: ${PORT}`);
        })
    })
    .catch((error) => {
        console.error(`Mongodb Connection Failed: ${error}`);
    });