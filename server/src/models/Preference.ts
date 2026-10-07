import mongoose, { Schema } from 'mongoose';
const PreferenceSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: 'User', index: true }, travelType: String, budget: String, walking: Boolean, sustainabilityPreference: { type: Number, min: 0, max: 1 } }, { timestamps: true });
export default mongoose.models.Preference || mongoose.model('Preference', PreferenceSchema);
