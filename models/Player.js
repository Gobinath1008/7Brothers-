import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Player phone is required'],
      trim: true,
    },
    isCaptain: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound Unique Index: Mobile number must be unique across the tournament
// Player cannot register in two different teams in the same tournament
PlayerSchema.index({ tournament: 1, phone: 1 }, { unique: true });

export default mongoose.models.Player || mongoose.model('Player', PlayerSchema);
