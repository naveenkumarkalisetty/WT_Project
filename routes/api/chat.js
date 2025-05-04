const express = require('express');
const router = express.Router();
const { Chat } = require('../../model/chat');

router.get('/list', async (req, res) => {
    try {
        const chats = await Chat.find({
            $or: [
                { donor: req.user._id },
                { claimer: req.user._id }
            ]
        })
        .populate('donor', 'username name email')
        .populate('claimer', 'username name email')
        .sort({ lastMessage: -1 });
        
        res.json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post('/start', async (req, res) => {
    try {
        console.log('Chat start request received:', req.body);
        const { donorId, donationId } = req.body;
        console.log('Chat start request:', { donorId, donationId, currentUser: req.user._id });

        // Find existing chat
        let chat = await Chat.findOne({
            donationId,
            $or: [
                { donor: donorId, claimer: req.user._id },
                { donor: req.user._id, claimer: donorId }
            ]
        });

        if (!chat) {
            console.log('Creating new chat');
            chat = await Chat.create({
                donationId,
                donor: donorId,
                claimer: req.user._id,
                messages: []
            });
            console.log('New chat created:', chat._id);
        } else {
            console.log('Found existing chat:', chat._id);
        }

        if (!chat._id) {
            throw new Error('Chat creation failed');
        }

        res.json({ chatId: chat._id.toString() });
    } catch (err) {
        console.error('Error in chat/start:', err);
        res.status(500).json({ message: err.message });
    }
});

// Add endpoint to mark messages as read
router.post('/:chatId/read', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) return res.status(404).json({ message: 'Chat not found' });
        
        // Mark messages as read for the current user
        chat.messages.forEach(msg => {
            if (msg.sender.toString() !== req.user._id.toString()) {
                msg.read = true;
            }
        });
        await chat.save();
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:chatId', async (req, res) => {
    try {
        console.log('Fetching chat with ID:', req.params.chatId);
        const chat = await Chat.findById(req.params.chatId)
            .populate('donor', 'username name email')
            .populate('claimer', 'username name email');
        
        if (!chat) {
            console.error('Chat not found:', req.params.chatId);
            return res.status(404).json({ message: 'Chat not found' });
        }
        
        console.log('Found chat:', {
            id: chat._id,
            donor: chat.donor._id,
            claimer: chat.claimer._id,
            messageCount: chat.messages.length
        });
        
        res.json(chat);
    } catch (err) {
        console.error('Error in chat retrieval:', err);
        res.status(500).json({ message: err.message });
    }
});






module.exports = router;
