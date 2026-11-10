import connectToDatabase from '../../lib/db.js';
import Match from '../../models/Match.js';
import BallDelivery from '../../models/BallDelivery.js';
import { authenticateAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const adminUser = await authenticateAdmin(req, res);
    if (!adminUser) return;

    const { matchId } = req.body || {};
    if (!matchId) {
      return res.status(400).json({ success: false, message: 'Match ID is required' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Find the latest delivery for this match
    const lastBall = await BallDelivery.findOne({ match: match._id }).sort({ createdAt: -1 });
    if (!lastBall) {
      return res.status(400).json({ success: false, message: 'No balls to undo in this match' });
    }

    const currentInnNum = lastBall.innings;
    const innings = currentInnNum === 1 ? match.innings1 : match.innings2;

    const totalRunsBall = (lastBall.runsBat || 0) + (lastBall.extraRuns || 0);
    innings.runs = Math.max(0, innings.runs - totalRunsBall);

    if (lastBall.extraType === 'WIDE') {
      innings.extras.wide = Math.max(0, innings.extras.wide - lastBall.extraRuns);
    } else if (lastBall.extraType === 'NO_BALL') {
      innings.extras.noBall = Math.max(0, innings.extras.noBall - lastBall.extraRuns);
    } else if (lastBall.extraType === 'BYE') {
      innings.extras.bye = Math.max(0, innings.extras.bye - lastBall.extraRuns);
    } else if (lastBall.extraType === 'LEG_BYE') {
      innings.extras.legBye = Math.max(0, innings.extras.legBye - lastBall.extraRuns);
    }
    innings.extras.total = Math.max(0, innings.extras.total - lastBall.extraRuns);

    // Roll back overs & balls if legal delivery
    if (lastBall.isLegalDelivery) {
      if (innings.balls === 0 && innings.overs > 0) {
        innings.overs -= 1;
        innings.balls = 5;
      } else {
        innings.balls = Math.max(0, innings.balls - 1);
      }
    }

    // Roll back wicket
    if (lastBall.isWicket) {
      innings.wickets = Math.max(0, innings.wickets - 1);
    }

    // Roll back batting card
    const strikerCard = match.battingCard.find(
      (b) => b.player && b.player.toString() === lastBall.striker.id.toString()
    );
    if (strikerCard) {
      strikerCard.runs = Math.max(0, strikerCard.runs - (lastBall.runsBat || 0));
      if (lastBall.extraType !== 'WIDE') {
        strikerCard.balls = Math.max(0, strikerCard.balls - 1);
      }
      if (lastBall.runsBat === 4) strikerCard.fours = Math.max(0, strikerCard.fours - 1);
      if (lastBall.runsBat === 6) strikerCard.sixes = Math.max(0, strikerCard.sixes - 1);
      strikerCard.strikeRate = strikerCard.balls > 0 ? Number(((strikerCard.runs / strikerCard.balls) * 100).toFixed(1)) : 0;

      if (lastBall.isWicket && (!lastBall.playerOut || lastBall.playerOut.id?.toString() === strikerCard.player.toString())) {
        strikerCard.isOut = false;
        strikerCard.dismissal = 'not out';
      }
    }

    // Roll back bowling card
    const bowlerCard = match.bowlingCard.find(
      (b) => b.player && b.player.toString() === lastBall.bowler.id.toString()
    );
    if (bowlerCard) {
      if (lastBall.isLegalDelivery) {
        if (bowlerCard.balls === 0 && bowlerCard.overs > 0) {
          bowlerCard.overs -= 1;
          bowlerCard.balls = 5;
        } else {
          bowlerCard.balls = Math.max(0, bowlerCard.balls - 1);
        }
      }
      if (lastBall.extraType !== 'BYE' && lastBall.extraType !== 'LEG_BYE') {
        bowlerCard.runsConceded = Math.max(0, bowlerCard.runsConceded - totalRunsBall);
      }
      if (lastBall.isWicket && lastBall.wicketType !== 'RUN_OUT') {
        bowlerCard.wickets = Math.max(0, bowlerCard.wickets - 1);
      }
      const totalOvers = bowlerCard.overs + bowlerCard.balls / 6;
      bowlerCard.economy = totalOvers > 0 ? Number((bowlerCard.runsConceded / totalOvers).toFixed(1)) : bowlerCard.runsConceded;
    }

    // If match was completed, set back to LIVE
    if (match.status === 'COMPLETED' || match.status === 'TIED') {
      match.status = 'LIVE';
      match.winner = null;
      match.loser = null;
      match.winMargin = '';
    }

    // Delete the ball from DB
    await BallDelivery.findByIdAndDelete(lastBall._id);
    await match.save();

    return res.status(200).json({
      success: true,
      message: 'Last ball successfully undone ↺',
      match,
      undoneBall: lastBall,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Error undoing ball delivery' });
  }
}
