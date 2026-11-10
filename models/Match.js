import mongoose from 'mongoose';

const InningsSummarySchema = new mongoose.Schema(
  {
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    target: { type: Number, default: 0 },
    extras: {
      wide: { type: Number, default: 0 },
      noBall: { type: Number, default: 0 },
      bye: { type: Number, default: 0 },
      legBye: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const BattingCardItemSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    playerName: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    dismissal: { type: String, default: 'not out' },
    onStrike: { type: Boolean, default: false },
    isBatting: { type: Boolean, default: false },
  },
  { _id: false }
);

const BowlingCardItemSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    playerName: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    isCurrentBowler: { type: Boolean, default: false },
  },
  { _id: false }
);

const MatchSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    matchNumber: {
      type: Number,
      required: true,
    },
    round: {
      type: Number,
      required: true,
      index: true,
    },
    roundName: {
      type: String,
      required: true,
    },
    teamA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    teamB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    teamAName: {
      type: String,
      default: 'TBD',
    },
    teamBName: {
      type: String,
      default: 'TBD',
    },
    nextMatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    nextMatchSlot: {
      type: String,
      enum: ['teamA', 'teamB', null],
      default: null,
    },
    isBye: {
      type: Boolean,
      default: false,
    },
    venue: {
      type: String,
      default: '',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'LIVE', 'COMPLETED', 'TIED', 'CANCELLED'],
      default: 'UPCOMING',
      index: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    loser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    winMargin: {
      type: String,
      default: '',
    },
    toss: {
      wonBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
      choice: { type: String, enum: ['BAT', 'BOWL', null], default: null },
    },
    currentInnings: {
      type: Number,
      default: 1,
    },
    innings1: {
      type: InningsSummarySchema,
      default: () => ({}),
    },
    innings2: {
      type: InningsSummarySchema,
      default: () => ({}),
    },
    battingCard: {
      type: [BattingCardItemSchema],
      default: [],
    },
    bowlingCard: {
      type: [BowlingCardItemSchema],
      default: [],
    },
    isSuperOver: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

MatchSchema.index({ tournament: 1, matchNumber: 1 }, { unique: true });

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
