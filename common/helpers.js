const client = require("../lib/redis");

module.exports = {
  getValue: async (key) => {
    try {
      const value = await client.get(key);
      console.log(value, " is read from Redis against a key", key);
      const result = value === null ? key + " doesn't have any value in redis" : value;
      return result;
    } catch (error) {
      throw new Error("Error reading data from Redis");
    }
  },

  setValue: async (key, value) => {
    try {
      await client.set(key, value);
      console.log(value, " is set in Redis against a key", key);
      return value;
    } catch (error) {
      throw new Error("Error writing data to Redis");
    }
  },

  setHashValue: async (key, hsetObj) => {
    try {
      await client.hSet(key, hsetObj);
      console.log(hsetObj, " is set in Redis against a key", key);
      return hsetObj;
    } catch (error) {
      throw new Error("Error writing data to Redis");
    }
  },
};
