import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    captainName: {
      type: String,
      default: 'Captain',
      trim: true,
    },
    captainPhone: {
      type: String,
      default: '',
      trim: true,
    },
    secondaryPhone: {
      type: String,
      default: '',
      trim: true,
    },
    logo: {
      type: String,
      default: '',
    },
    registrationId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'CONFIRMED', 'ELIMINATED', 'CHAMPION', 'RUNNER_UP'],
      default: 'REGISTERED',
      index: true,
    },
    seed: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound Unique Index: prevent duplicate team names within the same tournament
TeamSchema.index({ tournament: 1, normalizedName: 1 }, { unique: true });

delete mongoose.models.Team;
export default mongoose.model('Team', TeamSchema);
