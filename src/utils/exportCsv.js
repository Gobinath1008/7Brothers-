/**
 * CSV Export Utilities for Registrations and Fixtures
 */

export function downloadRegistrationsCsv(tournament, registrations) {
  if (!registrations || registrations.length === 0) {
    alert('No registrations available to export.');
    return;
  }

  const rows = [
    ['Registration ID', 'Team Name', 'Captain Name', 'Captain Mobile', 'Player Count', 'Players (Name & Phone)', 'Registered Date', 'Status'],
  ];

  registrations.forEach((reg) => {
    const playersStr = (reg.players || [])
      .map((p) => `${p.name} (${p.phone})${p.isCaptain ? ' [C]' : ''}`)
      .join('; ');

    rows.push([
      reg.registrationId || '',
      `"${reg.teamName || reg.name || ''}"`,
      `"${reg.captainName || ''}"`,
      `"${reg.captainPhone || ''}"`,
      reg.playerCount || (reg.players || []).length,
      `"${playersStr}"`,
      new Date(reg.createdAt).toLocaleDateString('en-IN'),
      reg.status || 'REGISTERED',
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `${(tournament?.name || 'Tournament').replace(/\s+/g, '_')}_Registrations_${Date.now()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadFixturesCsv(tournament, fixtures) {
  if (!fixtures || fixtures.length === 0) {
    alert('No fixtures available to export.');
    return;
  }

  const rows = [
    ['Match #', 'Round', 'Team A', 'Team B', 'Date & Time', 'Venue', 'Status', 'Winner', 'Margin', 'Inn 1 Score', 'Inn 2 Score'],
  ];

  fixtures.forEach((f) => {
    rows.push([
      f.matchNumber,
      `"${f.roundName || ''}"`,
      `"${f.teamA || ''}"`,
      `"${f.teamB || ''}"`,
      f.scheduledAt ? new Date(f.scheduledAt).toLocaleString('en-IN') : 'TBD',
      `"${f.venue || ''}"`,
      f.status,
      `"${f.winner || '-'}"`,
      `"${f.winMargin || '-'}"`,
      `"${f.innings1Score || '-'}"`,
      `"${f.innings2Score || '-'}"`,
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `${(tournament?.name || 'Tournament').replace(/\s+/g, '_')}_Fixtures_${Date.now()}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
