const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3100;

// MongoDB connection
mongoose.connect(`${process.env.MONGODB_URL}/test`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err.message);
  process.exit(1);
});

// Redis connection
const client = redis.createClient();

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', err => {
  console.error('Error connecting to Redis:', err.message);
});

// Define routes
app.get('/api/data', (req, res) => {
  // Implement your MongoDB data retrieval logic here
  res.send('Data from MongoDB');
});

app.post('/api/data', (req, res) => {
  // Implement your MongoDB data insertion logic here
  res.send('Data inserted into MongoDB');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
///////////////////
app.get('/api/data', (req, res) => {
    // Check if data is cached in Redis
    client.get('data', (err, cachedData) => {
      if (err) {
        console.error('Error retrieving data from Redis:', err.message);
        // If error, fall back to MongoDB
        // Implement MongoDB data retrieval logic here
        res.send('Data from MongoDB');
      } else if (cachedData) {
        // If data exists in Redis cache, send it
        res.send('Data from Redis: ' + cachedData);
      } else {
        // If data is not cached, retrieve from MongoDB
        // Implement MongoDB data retrieval logic here
        const data = 'Data from MongoDB';
        // Cache the data in Redis
        client.setex('data', 3600, data); // Cache for 1 hour
        res.send(data);
      }
    });
  });
  
  app.post('/api/data', (req, res) => {
    // Implement your MongoDB data insertion logic here
    // After insertion, invalidate relevant Redis cache if needed
    client.del('data'); // Delete cached data
    res.send('Data inserted into MongoDB');
  });
  
