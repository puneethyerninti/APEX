require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

mongoose.connect(uri)
.then(async () => {
    const db = mongoose.connection.db;
    const txs = await db.collection('transactions').find({ category: 'mobile_recharge' }).sort({ _id: -1 }).limit(3).toArray();
    console.log("Last 3 transactions:", JSON.stringify(txs, null, 2));
    mongoose.disconnect();
})
.catch(err => console.error("Mongo Error:", err));
