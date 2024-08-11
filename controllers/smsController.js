const twilio = require("twilio");

module.exports.sendSms = async function (req, res) {
  const accountSid = process.env.TWILIO_ACCOUNTSID;
  const authToken = process.env.TWILIO_AUTHTOKEN;
  const client = twilio(accountSid, authToken);
  
  const { message, contacts } = req.body;

  let response = { success: false };
  
  try {
    for (const contact of contacts) {
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_NUMBER,
        to: contact.trim(),
      });
    }

    response.success = true;
    res.sendStatus(200);
  } catch (error) {
    console.error("Error sending message:", error);

    res.status(502).json({
      success: false,
      error: "Failed to send message",
      message: error.message,
    });
  }
};
