import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Downloads full registrations report as PDF
 */
export function downloadAllRegistrationsPdf(tournament, registrations, stats) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent Line (Neon Lime)
  doc.setFillColor(132, 204, 22); // lime-500
  doc.rect(0, 42, pageWidth, 2, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('BOX CRICKET TOURNAMENT - OFFICIAL REGISTRATIONS', 14, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Tournament: ${tournament?.name || 'Tournament'}`, 14, 26);
  doc.text(
    `Date: ${tournament?.tournamentDate ? new Date(tournament.tournamentDate).toLocaleDateString('en-IN') : 'TBD'}  |  Venue: ${tournament?.venue || 'TBD'}`,
    14,
    33
  );

  // Stats Card Info
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const totalTeams = registrations?.length || 0;
  const totalPlayers = registrations?.reduce((sum, r) => sum + (r.players?.length || 0), 0) || 0;

  doc.text(
    `Total Teams: ${totalTeams}  |  Total Players: ${totalPlayers}  |  Generated: ${new Date().toLocaleString('en-IN')}`,
    14,
    52
  );

  // Table Data
  const tableRows = [];
  registrations.forEach((reg, index) => {
    const playersList = (reg.players || [])
      .map((p, pIdx) => `${pIdx + 1}. ${p.name} (${p.phone})${p.isCaptain ? ' [C]' : ''}`)
      .join('\n');

    tableRows.push([
      index + 1,
      reg.registrationId || `REG-${index + 1}`,
      reg.teamName || reg.name || 'Team',
      `${reg.captainName}\n${reg.captainPhone}`,
      playersList || 'No players listed',
      reg.status || 'CONFIRMED',
    ]);
  });

  autoTable(doc, {
    startY: 56,
    head: [['#', 'Reg ID', 'Team Name', 'Captain Details', 'Squad Members (Mobile)', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 35 },
      4: { cellWidth: 62 },
      5: { cellWidth: 22, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: function (data) {
      // Footer Page Number
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}  |  Confidential Tournament Report  |  Box Cricket Manager`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`${(tournament?.name || 'Tournament').replace(/\s+/g, '_')}_Registrations.pdf`);
}

/**
 * Downloads Individual Team Registration Slip / Certificate
 */
export function downloadTeamRegistrationPdf(tournament, team) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Box
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 48, 'F');
  doc.setFillColor(132, 204, 22);
  doc.rect(0, 48, pageWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL TEAM REGISTRATION PASS', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(tournament?.name || 'Box Cricket Championship', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.text(
    `Venue: ${tournament?.venue || 'Main Ground'}  |  Date: ${tournament?.tournamentDate ? new Date(tournament.tournamentDate).toLocaleDateString('en-IN') : 'TBD'}`,
    pageWidth / 2,
    38,
    { align: 'center' }
  );

  // Registration ID Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 56, pageWidth - 28, 28, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Team: ${team.teamName || team.name}`, 20, 68);

  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Registration ID: ${team.registrationId}`, 20, 76);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`Status: ${team.status || 'CONFIRMED'}`, pageWidth - 60, 68);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Captain: ${team.captainName} (${team.captainPhone})`, pageWidth - 90, 76);

  // Player Squad Table
  const playerRows = (team.players || []).map((p, idx) => [
    idx + 1,
    p.name,
    p.phone,
    p.isCaptain ? 'Captain ⭐' : 'Player',
    'Verified',
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['#', 'Player Name', 'Contact Number', 'Role', 'Verification']],
    body: playerRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = doc.lastAutoTable.finalY + 25;

  // Signatures
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.line(20, finalY, 75, finalY);
  doc.text("Team Captain's Signature", 20, finalY + 6);

  doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
  doc.text('Tournament Organizer Seal', pageWidth - 80, finalY + 6);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Pass Generated on ${new Date().toLocaleString('en-IN')}  |  Present this pass at the ground entrance`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  doc.save(`${(team.teamName || team.name).replace(/\s+/g, '_')}_Registration_Pass.pdf`);
}

/**
 * Downloads Tournament Knockout Fixtures PDF
 */
export function downloadFixturesPdf(tournament, fixtures, stats) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for fixtures
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setFillColor(132, 204, 22);
  doc.rect(0, 38, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('BOX CRICKET KNOCKOUT FIXTURES & SCHEDULE', 14, 16);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Tournament: ${tournament?.name || 'Tournament'}  |  Venue: ${tournament?.venue || 'TBD'}  |  Date: ${tournament?.tournamentDate ? new Date(tournament.tournamentDate).toLocaleDateString('en-IN') : 'TBD'}`,
    14,
    25
  );

  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Notice Board Schedule  |  Generated on ${new Date().toLocaleString('en-IN')}`, 14, 32);

  const tableRows = fixtures.map((f) => [
    `M#${f.matchNumber}`,
    f.roundName || `Round ${f.round}`,
    f.teamA || 'TBD',
    'VS',
    f.teamB || 'TBD',
    f.scheduledAt ? new Date(f.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
    f.venue || tournament?.venue || 'Main Pitch',
    f.status,
    f.winner ? `${f.winner} (${f.winMargin || 'Won'})` : (f.status === 'LIVE' ? 'LIVE' : 'Upcoming'),
  ]);

  autoTable(doc, {
    startY: 44,
    head: [['Match', 'Round Stage', 'Team A', '', 'Team B', 'Time', 'Pitch/Venue', 'Status', 'Result / Winner']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 32, fontStyle: 'bold' },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 10, halign: 'center', textColor: [100, 116, 139] },
      4: { cellWidth: 42, fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 32 },
      7: { cellWidth: 24, halign: 'center' },
      8: { cellWidth: 50 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: function (data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}  |  Official Tournament Notice Board Fixture Sheet`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`${(tournament?.name || 'Tournament').replace(/\s+/g, '_')}_Knockout_Fixtures.pdf`);
}
