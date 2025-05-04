const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donorId: {type: String},
    donorType: String,
    foodCategory: String,
    foodType: String,
    specifyItems: String,
    quantity: String,
    location: String,
    expiryTime: Date,
    contactNumber: String,
    foodImagePath: String,
    foodImageName: String,
    lat: String,
    lng: String,
    status: { type: String, enum: ['unclaimed', 'claimed', 'completed'], default: 'unclaimed' },
    claimedBy: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegisteredUser' },
        name: String,
        email: String,
        contactNumber: String,
        claimDate: { type: Date, default: Date.now }
    },
    createdAt: { type: Date, default: Date.now }
});

const Donation = mongoose.model('Donation', donationSchema);
module.exports = {Donation};
