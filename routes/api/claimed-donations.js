const express = require('express');
const router = express.Router();
const { Donation } = require('../../model/donation.js');

router.get('/', async (req, res) => {
    try {
        // req.user.claimedDonations should contain an array of donation ids
        const claimedDonations = await Donation.find({ _id: { $in: req.user.claimedDonations } });
        res.status(200).json(claimedDonations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
