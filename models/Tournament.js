import mongoose from 'mongoose';

const TournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    tournamentDate: {
      type: Date,
      required: [true, 'Tournament date is required'],
    },
    regDeadline: {
      type: Date,
      required: [true, 'Registration closing date & time is required'],
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    playersPerTeam: {
      type: Number,
      required: [true, 'Number of players per team is required'],
      default: 7,
      min: 4,
      max: 15,
    },
    oversPerMatch: {
      type: Number,
      required: [true, 'Overs per match is required'],
      default: 5,
      min: 1,
      max: 50,
    },
    format: {
      type: String,
      default: 'Knockout',
      enum: ['Knockout'],
    },
    maxTeams: {
      type: Number,
      default: 16,
      min: 2,
      max: 64,
    },
    matchDuration: {
      type: Number, // in minutes
      default: 45,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'UPCOMING',
        'REGISTRATION_OPEN',
        'REGISTRATION_CLOSED',
        'FIXTURES_GENERATED',
        'ONGOING',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'REGISTRATION_OPEN',
      index: true,
    },
    finalTeamsConfirmed: {
      type: Boolean,
      default: false,
    },
    fixturesGenerated: {
      type: Boolean,
      default: false,
    },
    champion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    runnerUp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
  },
  { timestamps: true }
);

// Auto slug generation before save
TournamentSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);
  }
  next();
});

export default mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema);
