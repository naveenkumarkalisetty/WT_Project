const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://sreedhar:sreedhar96@firstcluster.6vi7p.mongodb.net/FoodBridge?retryWrites=true&w=majority&appName=FirstCluster");
    } catch (err) {
        console.log(err);
    }
}
module.exports = connectDB;