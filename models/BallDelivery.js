import mongoose from 'mongoose';

const BallDeliverySchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      index: true,
    },
    innings: {
      type: Number,
      required: true,
      enum: [1, 2],
    },
    overNumber: {
      type: Number,
      required: true,
    },
    ballInOver: {
      type: Number,
      required: true,
    },
    striker: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      name: { type: String, required: true },
    },
    nonStriker: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      name: { type: String, required: true },
    },
    bowler: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      name: { type: String, required: true },
    },
    runsBat: {
      type: Number,
      default: 0,
      min: 0,
      max: 6,
    },
    extraRuns: {
      type: Number,
      default: 0,
      min: 0,
    },
    extraType: {
      type: String,
      enum: ['NONE', 'WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'],
      default: 'NONE',
    },
    isLegalDelivery: {
      type: Boolean,
      default: true,
    },
    isWicket: {
      type: Boolean,
      default: false,
    },
    wicketType: {
      type: String,
      enum: ['BOWLED', 'CAUGHT', 'RUN_OUT', 'STUMPED', 'LBW', 'HIT_WICKET', 'NONE'],
      default: 'NONE',
    },
    playerOut: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
      name: { type: String, default: '' },
    },
    ballSummary: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

BallDeliverySchema.index({ match: 1, innings: 1, createdAt: -1 });

export default mongoose.models.BallDelivery || mongoose.model('BallDelivery', BallDeliverySchema);
