import mongoose, { Schema } from 'mongoose';
const SavedPlaceSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, placeId: { type: String, required: true }, name: { type: String, required: true }, googleMapsUri: String }, { timestamps: true });
export default mongoose.models.SavedPlace || mongoose.model('SavedPlace', SavedPlaceSchema);
