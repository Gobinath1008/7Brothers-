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
      required: [true, 'Captain name is required'],
      trim: true,
    },
    captainPhone: {
      type: String,
      required: [true, 'Captain phone number is required'],
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

// Compound Unique Indexes to prevent duplicate submissions within the same tournament
TeamSchema.index({ tournament: 1, normalizedName: 1 }, { unique: true });
TeamSchema.index({ tournament: 1, captainPhone: 1 }, { unique: true });

export default mongoose.models.Team || mongoose.model('Team', TeamSchema);
