const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredUser', required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', required: true },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredUser', required: true },
    claimer: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredUser', required: true },
    messages: [messageSchema],
    lastMessage: { type: Date, default: Date.now }
}, { timestamps: true });

// Add indexes for better query performance
chatSchema.index({ donor: 1, claimer: 1 });
chatSchema.index({ lastMessage: -1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = { Chat };
