import mongoose from "mongoose";

const User = new mongoose.Schema({
  userId: { type: String, required: true},
  username: { type: String, required: false },
  imageUrl: { type: String, required: false },
  voiceTime: { type: Number, default: 0 },
});

export default mongoose.model("User", User);
