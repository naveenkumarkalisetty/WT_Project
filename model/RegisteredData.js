const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const baseOptions = {
    discriminatorKey: "role", 
    timestamps: true
}

const RegisteredBaseSchema = new Schema(
    {
        email: {
            type: String,
            require: true,
            unique: true
        },
        password: {
            type: String,
            required: false
        },
        // Added new fields for location details
        address: { type: String, required: false },
        lat: { type: String, required: false },
        lon: { type: String, required: false },
        contactNumber: { type: String, required: false },
        claimedDonations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Donation' }]
    },
    baseOptions
);

const RegisteredBase = mongoose.model("RegisteredUser", RegisteredBaseSchema);

const userSchema = new Schema({
    username: {type: String, required: true},
    age:{type: Number, required: true}
});

const User = RegisteredBase.discriminator("user", userSchema);

const corporationSchema = new Schema({
    name: {type: String, required: true},
    corporationType: { type: String, enum:["Corporation", "Mess"] }
});
const Corporation = RegisteredBase.discriminator("corporation", corporationSchema);

const ngoSchema = new Schema({
    name: {type: String, required: true},
    details: {type: String, required: true}
});
const NGO = RegisteredBase.discriminator("ngo", ngoSchema);

module.exports = {RegisteredBase, User, Corporation, NGO};