require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 3000,
})
.then(() => {
  console.log("🔥 Connected to MongoDB SUCCESSFULLY");
  process.exit();
})
.catch((err) => {
  console.error("💀 MongoDB CONNECTION FAILED");
  console.error(err);
  process.exit();
});
