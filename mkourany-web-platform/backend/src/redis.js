const { createClient } = require("redis");

const client = createClient({
    socket: {
        host: process.env.REDIS_HOST || "redis",
        port: Number(process.env.REDIS_PORT || 6379),
    },
});

client.on("connect", () => {
    console.log("Connected to Redis");
});

client.on("error", (err) => {
    console.error("Redis Error:", err.message);
});

(async () => {
    await client.connect();
})();

module.exports = client;