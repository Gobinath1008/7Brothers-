import { generateKnockoutTree, linkKnockoutMatches } from '../lib/bracket.js';

console.log('--- TESTING BRACKET ALGORITHM ---');

function testBracketForN(n) {
  const teams = Array.from({ length: n }, (_, i) => ({
    _id: `team_${i + 1}`,
    name: `Team ${String.fromCharCode(65 + i)}`,
  }));

  const { matchesByRound, totalRounds, totalMatches } = generateKnockoutTree(
    teams,
    'tournament_123',
    'Main Ground',
    new Date()
  );

  console.log(`\nTesting ${n} teams: Total Rounds: ${totalRounds}, Total Matches: ${totalMatches}`);
  
  // Total matches in a single knockout tournament with N teams MUST always be N - 1!
  if (totalMatches !== n - 1) {
    throw new Error(`Expected ${n - 1} matches for ${n} teams, but got ${totalMatches}`);
  }

  // Create simulated match IDs
  const createdMatchesByRound = {};
  let mId = 1;
  for (const r of Object.keys(matchesByRound)) {
    createdMatchesByRound[r] = matchesByRound[r].map((m) => ({
      ...m,
      _id: `match_${mId++}`,
    }));
  }

  const links = linkKnockoutMatches(createdMatchesByRound);
  console.log(`Round count: ${Object.keys(matchesByRound).length}. Generated match links: ${links.length}`);
  
  // Verify that all non-final matches have a nextMatchId link
  const finalRound = totalRounds;
  let nonFinalMatchesCount = 0;
  for (let r = 1; r < finalRound; r++) {
    nonFinalMatchesCount += createdMatchesByRound[r].length;
  }
  
  if (links.length !== nonFinalMatchesCount) {
    throw new Error(`Expected ${nonFinalMatchesCount} links, but got ${links.length}`);
  }

  console.log(`✅ Success for ${n} teams!`);
}

// Test power of two
testBracketForN(4);
testBracketForN(8);
testBracketForN(16);

// Test non-powers of two (with byes)
testBracketForN(6);
testBracketForN(10);
testBracketForN(12);

console.log('\n🎉 ALL BRACKET TESTS PASSED PERFECTLY!');
