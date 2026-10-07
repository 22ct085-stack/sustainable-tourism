import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({ email: { type: String, unique: true, sparse: true }, name: String }, { timestamps: true });
export default mongoose.models.User || mongoose.model('User', UserSchema);
