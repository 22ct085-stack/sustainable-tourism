import mongoose, { Schema } from 'mongoose';
const ReviewSchema = new Schema({ placeId: { type: String, required: true, index: true }, userId: { type: Schema.Types.ObjectId, ref: 'User' }, rating: { type: Number, min: 1, max: 5, required: true }, comment: String }, { timestamps: true });
export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
