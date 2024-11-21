const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    uname: { type: String, required: true },
    messageText: { type: String, required: true },
    time: { type: Date, default: Date.now }
});

// Create a model from the schema
const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat; // Export the model