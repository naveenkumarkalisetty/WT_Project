const express = require('express');
const router = express.Router();
const sendEmail = require('./mail');
const { Donation } = require('../../model/donation.js');
const { RegisteredBase } = require('../../model/RegisteredData.js');

router.post('/', async (req, res) => {

    
    try {
        const { donationId } = req.body;
        
        const donat = await Donation.findById({_id:donationId});
        const donor = await RegisteredBase.findById(donat.donorId);

        
        await sendEmail(donor.email, donor);
        

        if (!donationId) return res.status(400).json({ message: "DonationId not provided" });
        console.log(req.user);
        const donation = await Donation.findByIdAndUpdate(donationId, {
            status: "claimed",
            claimedBy: {
                userId: req.user._id,
                name: req.user.username || req.user.name,
                email: req.user.email,
                contactNumber: req.user.contactNumber || 'Not provided'
            }
        });

        if (!donation) return res.status(404).json({ message: "Donation not found" });
        req.user.claimedDonations.push(donationId);
        await req.user.save();
        res.status(200).json({ message: "Donation claimed successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
