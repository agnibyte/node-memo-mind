// server.js

const express = require('express');
const redis = require('redis');

const app = express();
const client = redis.createClient();

app.use(express.json());

// Create operation
app.post('/create', (req, res) => {
    console.log(req.body);
    const { key, value } = req.body;
    client.set(key, value, (err, reply) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error creating data in Redis');
        } else {
            console.log(reply);
            res.status(200).send('Data created successfully in Redis');
        }
    });
});

// Read operation
app.get('/read/:key', (req, res) => {
    const key = req.params.key;
    client.get(key, (err, reply) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error reading data from Redis');
        } else {
            console.log(reply);
            res.status(200).send(reply);
        }
    });
});

// Update operation
app.put('/update', (req, res) => {
    const { key, value } = req.body;
    client.set(key, value, (err, reply) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error updating data in Redis');
        } else {
            console.log(reply);
            res.status(200).send('Data updated successfully in Redis');
        }
    });
});

// Delete operation
app.delete('/delete/:key', (req, res) => {
    const key = req.params.key;
    client.del(key, (err, reply) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error deleting data from Redis');
        } else {
            console.log(reply);
            res.status(200).send('Data deleted successfully from Redis');
        }
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
