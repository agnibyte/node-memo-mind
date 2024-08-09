const redis = require("redis");

const client = redis.createClient({
    // Specify host and port of the Redis server
    host: '192.168.0.126',
    port: 44055, // Default Redis port is 6379
    
    // Add more configurations as needed
});

client.on("error", (err) => console.log("Redis Client Error", err));

client.connect();
module.exports = client