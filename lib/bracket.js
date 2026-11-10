/**
 * Knockout Bracket Generation and Winner Advancement Library
 */

/**
 * Shuffles an array randomly (Fisher-Yates)
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Finds the nearest power of 2 greater than or equal to n
 */
export function getNextPowerOfTwo(n) {
  let p = 1;
  while (p < n) {
    p *= 2;
  }
  return p;
}

/**
 * Returns human-readable round name given total remaining teams in that round
 */
export function getRoundName(teamsInRound, roundNumber, totalRounds) {
  if (roundNumber === totalRounds || teamsInRound === 2) return 'Final';
  if (roundNumber === totalRounds - 1 || teamsInRound === 4) return 'Semi-Final';
  if (roundNumber === totalRounds - 2 || teamsInRound === 8) return 'Quarter-Final';
  if (teamsInRound === 16) return 'Round of 16';
  if (teamsInRound === 32) return 'Round of 32';
  return `Round ${roundNumber}`;
}

/**
 * Generates knockout matches structure for N teams
 * Handles both power-of-two (4, 8, 16) and non-power-of-two (6, 10, 12, etc. with mathematical byes)
 *
 * @param {Array} teams - Array of team objects [{ _id, name }]
 * @param {String} tournamentId - Tournament ObjectId
 * @param {String} venue - Default venue
 * @param {Date} startDate - Base start date
 */
export function generateKnockoutTree(teams, tournamentId, venue = 'Main Arena', startDate = new Date()) {
  if (!teams || teams.length < 2) {
    throw new Error('At least 2 teams are required to generate knockout fixtures');
  }

  const shuffled = shuffleArray(teams);
  const n = shuffled.length;
  const p = getNextPowerOfTwo(n); // e.g. 6 -> 8, 10 -> 16
  const numByes = p - n; // Teams receiving a bye directly to Round 2
  const numRound1Teams = n - numByes; // Teams playing in Round 1
  const numRound1Matches = numRound1Teams / 2;

  // Total rounds = log2(p)
  const totalRounds = Math.log2(p);

  // Teams playing Round 1 vs teams getting a bye
  const byeTeams = shuffled.slice(0, numByes);
  const round1Teams = shuffled.slice(numByes);

  const matchesByRound = {};
  for (let r = 1; r <= totalRounds; r++) {
    matchesByRound[r] = [];
  }

  let matchCounter = 1;

  // If there are Round 1 preliminary matches (when n is not a power of 2)
  if (numByes > 0 && numRound1Matches > 0) {
    for (let i = 0; i < numRound1Matches; i++) {
      const teamA = round1Teams[i * 2];
      const teamB = round1Teams[i * 2 + 1];
      matchesByRound[1].push({
        tournament: tournamentId,
        matchNumber: matchCounter++,
        round: 1,
        roundName: `Round 1 - Match ${i + 1}`,
        teamA: teamA._id,
        teamB: teamB._id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        venue,
        scheduledAt: new Date(new Date(startDate).getTime() + (matchCounter - 1) * 45 * 60000),
        status: 'UPCOMING',
        isBye: false,
      });
    }
  }

  // Round 2 (or Round 1 if n was already a power of 2)
  const round2MatchesCount = p / 4; // e.g., if p=8, 2 matches (Semi-finals); if p=16, 4 matches (Quarter-finals)
  const startRound = numByes > 0 && numRound1Matches > 0 ? 2 : 1;

  if (startRound === 1) {
    // Exact power of two (e.g. 4, 8, 16)
    const matchesInRound1 = n / 2;
    const rName = getRoundName(n, 1, totalRounds);
    for (let i = 0; i < matchesInRound1; i++) {
      const teamA = shuffled[i * 2];
      const teamB = shuffled[i * 2 + 1];
      matchesByRound[1].push({
        tournament: tournamentId,
        matchNumber: matchCounter++,
        round: 1,
        roundName: `${rName} ${i + 1}`,
        teamA: teamA._id,
        teamB: teamB._id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        venue,
        scheduledAt: new Date(new Date(startDate).getTime() + (matchCounter - 1) * 45 * 60000),
        status: 'UPCOMING',
        isBye: false,
      });
    }
  } else {
    // Non-power of 2: round 2 combines bye teams and Round 1 winners
    const rName = getRoundName(p / 2, 2, totalRounds);
    let byeIndex = 0;
    for (let i = 0; i < round2MatchesCount; i++) {
      // Slot A might be a bye team or winner of R1
      let teamA = null;
      let teamAName = 'TBD';
      let teamB = null;
      let teamBName = 'TBD';

      if (byeIndex < byeTeams.length) {
        teamA = byeTeams[byeIndex]._id;
        teamAName = `${byeTeams[byeIndex].name} (Bye)`;
        byeIndex++;
      }
      if (byeIndex < byeTeams.length) {
        teamB = byeTeams[byeIndex]._id;
        teamBName = `${byeTeams[byeIndex].name} (Bye)`;
        byeIndex++;
      }

      matchesByRound[2].push({
        tournament: tournamentId,
        matchNumber: matchCounter++,
        round: 2,
        roundName: `${rName} ${i + 1}`,
        teamA,
        teamB,
        teamAName,
        teamBName,
        venue,
        scheduledAt: new Date(new Date(startDate).getTime() + (matchCounter - 1) * 45 * 60000),
        status: 'UPCOMING',
        isBye: false,
      });
    }
  }

  // Generate subsequent rounds up to Final
  const fromRound = startRound === 1 ? 2 : 3;
  let remainingTeams = startRound === 1 ? n / 2 : p / 4;

  for (let r = fromRound; r <= totalRounds; r++) {
    const matchesInRound = remainingTeams / 2;
    const rName = getRoundName(remainingTeams, r, totalRounds);

    for (let i = 0; i < matchesInRound; i++) {
      matchesByRound[r].push({
        tournament: tournamentId,
        matchNumber: matchCounter++,
        round: r,
        roundName: matchesInRound === 1 ? rName : `${rName} ${i + 1}`,
        teamA: null,
        teamB: null,
        teamAName: 'TBD',
        teamBName: 'TBD',
        venue,
        scheduledAt: new Date(new Date(startDate).getTime() + (matchCounter - 1) * 45 * 60000),
        status: 'UPCOMING',
        isBye: false,
      });
    }
    remainingTeams /= 2;
  }

  return { matchesByRound, totalRounds, totalMatches: matchCounter - 1 };
}

/**
 * Links generated matches so each match knows its nextMatchId and nextMatchSlot
 */
export function linkKnockoutMatches(createdMatchesByRound) {
  const updates = [];
  const rounds = Object.keys(createdMatchesByRound).map(Number).sort((a, b) => a - b);

  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRoundNum = rounds[i];
    const nextRoundNum = rounds[i + 1];

    const currentMatches = createdMatchesByRound[currentRoundNum];
    const nextMatches = createdMatchesByRound[nextRoundNum];

    currentMatches.forEach((curMatch, idx) => {
      const nextMatchIdx = Math.floor(idx / 2);
      const slot = idx % 2 === 0 ? 'teamA' : 'teamB';

      if (nextMatches[nextMatchIdx]) {
        updates.push({
          matchId: curMatch._id,
          nextMatchId: nextMatches[nextMatchIdx]._id,
          nextMatchSlot: slot,
        });
      }
    });
  }

  return updates;
}
