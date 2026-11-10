import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, ChevronRight, Award } from 'lucide-react';

export default function KnockoutBracketView({ matches = [], tournament = null, onSelectMatch = null }) {
  if (!matches || matches.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center max-w-lg mx-auto">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Knockout Bracket Not Ready</h3>
        <p className="text-sm text-slate-400">
          Fixtures will be generated after registration closes and the Admin verifies the confirmed teams.
        </p>
      </div>
    );
  }

  // Group matches by round number
  const roundsMap = {};
  matches.forEach((m) => {
    if (!roundsMap[m.round]) roundsMap[m.round] = [];
    roundsMap[m.round].push(m);
  });

  const sortedRounds = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
  const totalRounds = sortedRounds.length;

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="inline-flex min-w-full justify-start md:justify-center items-stretch gap-8 px-4">
        {sortedRounds.map((roundNum, rIdx) => {
          const roundMatches = roundsMap[roundNum];
          const isFinal = roundNum === totalRounds;
          const sampleMatch = roundMatches[0];
          const roundTitle = sampleMatch?.roundName?.split('-')[0]?.trim() || `Round ${roundNum}`;

          return (
            <div key={roundNum} className="flex flex-col min-w-[260px] max-w-[280px]">
              {/* Round Header */}
              <div className="mb-4 text-center">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-slate-800 text-lime-400 border border-slate-700/80">
                  {roundTitle}
                </span>
                <div className="text-[11px] text-slate-500 mt-1">
                  {roundMatches.length} {roundMatches.length === 1 ? 'Match' : 'Matches'}
                </div>
              </div>

              {/* Matches column */}
              <div className="flex-1 flex flex-col justify-around gap-6">
                {roundMatches.map((match) => {
                  const isCompleted = match.status === 'COMPLETED';
                  const isLive = match.status === 'LIVE';

                  const teamAWon = isCompleted && match.winner && (match.winner._id === match.teamA?._id || match.winner === match.teamA?._id);
                  const teamBWon = isCompleted && match.winner && (match.winner._id === match.teamB?._id || match.winner === match.teamB?._id);

                  const teamALost = isCompleted && !teamAWon;
                  const teamBLost = isCompleted && !teamBWon;

                  const cardContent = (
                    <div
                      className={`glass-panel rounded-xl p-3 border transition-all relative ${
                        isLive
                          ? 'border-red-500/80 bg-red-950/20 shadow-lg shadow-red-900/20'
                          : 'border-slate-800 hover:border-lime-500/50'
                      }`}
                    >
                      {/* Match # & Status badge */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2 pb-1.5 border-b border-slate-800/80">
                        <span>Match #{match.matchNumber}</span>
                        {isLive ? (
                          <span className="flex items-center gap-1 text-red-400 uppercase font-extrabold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 live-dot"></span> LIVE
                          </span>
                        ) : isCompleted ? (
                          <span className="text-lime-400 font-semibold text-[10px]">Finished</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Upcoming</span>
                        )}
                      </div>

                      {/* Team A */}
                      <div
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-semibold ${
                          teamAWon
                            ? 'bg-lime-500/15 text-lime-400 font-bold border border-lime-500/30'
                            : teamALost
                            ? 'text-slate-500 line-through opacity-70'
                            : 'text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">
                          {match.teamA?.name || match.teamAName || 'TBD'}
                        </span>
                        {match.innings1?.runs !== undefined && match.teamA && (
                          <span className="font-mono text-[11px]">
                            {match.innings1.battingTeam === match.teamA?._id
                              ? `${match.innings1.runs}/${match.innings1.wickets}`
                              : match.innings2.battingTeam === match.teamA?._id
                              ? `${match.innings2.runs}/${match.innings2.wickets}`
                              : ''}
                          </span>
                        )}
                      </div>

                      {/* Team B */}
                      <div
                        className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-semibold mt-1 ${
                          teamBWon
                            ? 'bg-lime-500/15 text-lime-400 font-bold border border-lime-500/30'
                            : teamBLost
                            ? 'text-slate-500 line-through opacity-70'
                            : 'text-slate-200'
                        }`}
                      >
                        <span className="truncate pr-2">
                          {match.teamB?.name || match.teamBName || 'TBD'}
                        </span>
                        {match.innings1?.runs !== undefined && match.teamB && (
                          <span className="font-mono text-[11px]">
                            {match.innings1.battingTeam === match.teamB?._id
                              ? `${match.innings1.runs}/${match.innings1.wickets}`
                              : match.innings2.battingTeam === match.teamB?._id
                              ? `${match.innings2.runs}/${match.innings2.wickets}`
                              : ''}
                          </span>
                        )}
                      </div>

                      {/* Margin */}
                      {match.winMargin && (
                        <div className="mt-2 text-[10px] text-lime-400 font-medium truncate bg-slate-900/80 px-2 py-0.5 rounded">
                          {match.winMargin}
                        </div>
                      )}
                    </div>
                  );

                  return onSelectMatch ? (
                    <div key={match._id} onClick={() => onSelectMatch(match)} className="cursor-pointer">
                      {cardContent}
                    </div>
                  ) : (
                    <Link key={match._id} to={`/matches/${match._id}`} className="block">
                      {cardContent}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Champion Trophy Column */}
        <div className="flex flex-col min-w-[200px] justify-center items-center">
          <div className="glass-panel p-6 rounded-2xl border-2 border-lime-500/60 text-center glow-lime-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-lime-500 to-emerald-400 text-slate-950 flex items-center justify-center mb-3 shadow-lg shadow-lime-500/20">
              <Trophy className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="text-[10px] uppercase font-black tracking-widest text-lime-400">CHAMPION</div>
            <div className="text-base font-extrabold text-white mt-1">
              {tournament?.champion?.name || (matches.find((m) => m.round === totalRounds && m.winner)?.winner?.name) || 'TBD'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {tournament?.runnerUp?.name && `Runner-up: ${tournament.runnerUp.name}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
