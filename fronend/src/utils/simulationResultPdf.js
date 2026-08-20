import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { scoreLabel, scoreToRgb } from './heatmapUtils';

const MARGIN = 10;
const FOOTER_Y_OFFSET = 8;

const audienceLabel = (audience) => {
  if (typeof audience === 'string') return audience;
  if (audience && typeof audience === 'object') {
    return audience.label || audience.type || audience.demographics?.[0] || 'General';
  }
  return 'General';
};

const formatPercent = (value) => `${Math.round(Number(value) * 100)}%`;

const formatSentimentAverage = (value) => {
  const numeric = Number(value) || 0;
  const scaled = Math.round(numeric * 100);
  return `${scaled >= 0 ? '+' : ''}${scaled}`;
};

const buildSummaryContent = (result) => {
  const details = result.summaryDetails ?? (typeof result.summary === 'object' ? result.summary : null);
  const audience = result.audienceType || audienceLabel(result.audience);
  const concept = result.concept || 'the proposed concept';

  if (typeof result.summary === 'string' && !details) {
    return {
      narrative: result.summary,
      rows: [],
    };
  }

  const rows = [];

  if (details && typeof details === 'object') {
    if (details.total_events != null) {
      rows.push(['Total Events Analyzed', String(details.total_events)]);
    }
    if (details.negative_ratio != null) {
      rows.push(['Negative Reaction Ratio', formatPercent(details.negative_ratio)]);
    }
    if (details.avg_volatility != null) {
      rows.push(['Average Volatility', formatPercent(details.avg_volatility)]);
    }
    if (details.average_sentiment != null) {
      rows.push(['Average Sentiment', formatSentimentAverage(details.average_sentiment)]);
    }
  }

  const totalEvents = details?.total_events ?? result.reactions?.length ?? 'multiple';
  const narrative = [
    `RaawaAI stress-tested "${concept}" against a synthetic ${audience} audience.`,
    `Across ${totalEvents} simulated events, the engine measured public resonance, volatility, and backlash risk before launch.`,
    `The results below summarize how the concept is likely to be received and where friction may appear during rollout.`,
  ].join(' ');

  return { narrative, rows };
};

const pageWidth = (doc) => doc.internal.pageSize.getWidth();
const pageHeight = (doc) => doc.internal.pageSize.getHeight();

const drawFooter = (doc, page, pageCount) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const footerY = pageHeight(doc) - FOOTER_Y_OFFSET;
  doc.text(`RaawaAI Simulation Report • Page ${page} of ${pageCount}`, MARGIN, footerY);
  doc.text(
    'Confidential — For internal resonance testing only',
    pageWidth(doc) / 2,
    footerY,
    { align: 'center' },
  );
};

const drawPageHeader = (doc, generatedAt) => {
  const width = pageWidth(doc);
  doc.setFillColor(5, 8, 22);
  doc.rect(0, 0, width, 22, 'F');
  doc.setTextColor(105, 210, 233);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RAAWAAI • SIMULATION REPORT', MARGIN, 8);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text('Simulation Report', MARGIN, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated ${generatedAt}`, width - MARGIN, 15, { align: 'right' });
  return 26;
};

const drawFlameIcon = (doc, cx, cy, size, color) => {
  doc.setFillColor(...color);
  doc.triangle(cx, cy - size * 0.55, cx - size * 0.42, cy + size * 0.35, cx + size * 0.42, cy + size * 0.35, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy + size * 0.12, size * 0.12, 'F');
};

const drawBrainIcon = (doc, cx, cy, size, color) => {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.ellipse(cx - size * 0.22, cy, size * 0.28, size * 0.38, 'S');
  doc.ellipse(cx + size * 0.22, cy, size * 0.28, size * 0.38, 'S');
  doc.line(cx - size * 0.22, cy, cx + size * 0.22, cy);
};

const drawBarChartIcon = (doc, cx, cy, size, color) => {
  const barWidth = size * 0.16;
  doc.setFillColor(...color);
  doc.roundedRect(cx - size * 0.34, cy + size * 0.05, barWidth, size * 0.42, 0.4, 0.4, 'F');
  doc.roundedRect(cx - barWidth / 2, cy - size * 0.12, barWidth, size * 0.58, 0.4, 0.4, 'F');
  doc.roundedRect(cx + size * 0.18, cy - size * 0.02, barWidth, size * 0.48, 0.4, 0.4, 'F');
};

const drawMetricIcon = (doc, type, cx, cy, size, color) => {
  if (type === 'flame') drawFlameIcon(doc, cx, cy, size, color);
  else if (type === 'brain') drawBrainIcon(doc, cx, cy, size, color);
  else drawBarChartIcon(doc, cx, cy, size, color);
};

const drawMetricCard = (doc, x, y, width, height, card) => {
  doc.setFillColor(10, 15, 30);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 4, 4, 'FD');

  const badgeSize = 13;
  const badgeX = x + width - badgeSize - 4;
  const badgeY = y + 4;
  doc.setFillColor(...card.badgeFill);
  doc.setDrawColor(...card.badgeBorder);
  doc.setLineWidth(0.2);
  doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 2.5, 2.5, 'FD');
  drawMetricIcon(doc, card.icon, badgeX + badgeSize / 2, badgeY + badgeSize / 2, 7, card.iconColor);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(100, 116, 139);
  doc.text(card.label.toUpperCase(), x + 4, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(card.value, x + 4, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  const descriptionLines = doc.splitTextToSize(card.description, width - 8);
  doc.text(descriptionLines.slice(0, 3), x + 4, y + 24);
};

const drawMetaAndMetrics = (doc, result, startY) => {
  const width = pageWidth(doc);
  const concept = result.concept || 'Untitled concept';
  const audience = result.audienceType || audienceLabel(result.audience);
  const simulationId = result.simulation_id || 'N/A';
  const eventCount = result.summaryDetails?.total_events ?? result.reactions?.length ?? 0;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, startY, width - MARGIN * 2, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Concept: ${concept}`, MARGIN + 3, startY + 6);
  doc.text(`Audience: ${audience}`, MARGIN + 3, startY + 11);
  doc.text(`Simulation ID: ${simulationId}`, MARGIN + 3, startY + 16);

  const sectionTop = startY + 22;
  const cardGap = 4;
  const cardWidth = (width - MARGIN * 2 - cardGap * 2) / 3;
  const cardHeight = 38;

  doc.setFillColor(2, 6, 23);
  doc.roundedRect(MARGIN, sectionTop, width - MARGIN * 2, cardHeight + 6, 3, 3, 'F');

  const cards = [
    {
      label: 'Backlash Probability',
      value: `${result.backlashProbability ?? 0}%`,
      description: 'AI-aggregated risk estimate based on persona reactions, regional volatility, and negative events.',
      icon: 'flame',
      badgeFill: [40, 15, 20],
      badgeBorder: [251, 113, 133],
      iconColor: [251, 113, 133],
    },
    {
      label: 'Sentiment Score',
      value: `${result.sentimentScore >= 0 ? '+' : ''}${result.sentimentScore ?? 0}`,
      description: 'Persona reactions are classified with sentiment scoring before the final aggregate is calculated.',
      icon: 'brain',
      badgeFill: [8, 47, 73],
      badgeBorder: [103, 232, 249],
      iconColor: [103, 232, 249],
    },
    {
      label: 'Event Coverage',
      value: `${eventCount}`,
      description: 'Multi-agent personas simulated across the configured horizon and summarized into the heat map.',
      icon: 'chart',
      badgeFill: [6, 44, 36],
      badgeBorder: [52, 211, 153],
      iconColor: [52, 211, 153],
    },
  ];

  cards.forEach((card, index) => {
    const x = MARGIN + 3 + index * (cardWidth + cardGap);
    const y = sectionTop + 3;
    drawMetricCard(doc, x, y, cardWidth, cardHeight, card);
  });

  return sectionTop + cardHeight + 10;
};

const drawSummarySection = (doc, result, startY) => {
  const width = pageWidth(doc);
  const bottomLimit = pageHeight(doc) - FOOTER_Y_OFFSET - 6;
  const { narrative, rows } = buildSummaryContent(result);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Simulation Summary', MARGIN, startY);
  doc.setDrawColor(105, 210, 233);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, startY + 1.5, width - MARGIN, startY + 1.5);

  doc.setFillColor(2, 6, 23);
  doc.roundedRect(MARGIN, startY + 4, width - MARGIN * 2, bottomLimit - startY - 4, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  const narrativeLines = doc.splitTextToSize(narrative, width - MARGIN * 2 - 8);
  let y = startY + 11;
  narrativeLines.forEach((line) => {
    doc.text(line, MARGIN + 4, y);
    y += 5;
  });

  if (rows.length > 0) {
    autoTable(doc, {
      startY: y + 2,
      tableWidth: width - MARGIN * 2 - 8,
      head: [['Insight', 'Result']],
      body: rows,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 4,
        textColor: [226, 232, 240],
        lineColor: [255, 255, 255],
        lineWidth: 0.08,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [148, 163, 184],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 78, fontStyle: 'bold', textColor: [148, 163, 184] },
        1: { fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255] },
      },
      alternateRowStyles: { fillColor: [10, 15, 30] },
      bodyStyles: { fillColor: [12, 18, 35] },
      margin: { left: MARGIN + 4, right: MARGIN + 4 },
    });
  }

  return bottomLimit;
};

const drawHeatmapSection = (doc, result) => {
  const heatmapRows = result.heatmapMatrix || [];
  if (heatmapRows.length === 0) return;

  doc.addPage('a4', 'landscape');
  const width = pageWidth(doc);
  const height = pageHeight(doc);

  doc.setFillColor(2, 6, 23);
  doc.rect(0, 0, width, height, 'F');

  const headerBottom = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('HEAT MAP', MARGIN, 10);
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('Region-by-day sentiment intensity', MARGIN, 16);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Negative', width - MARGIN - 48, 10);
  doc.setFillColor(239, 68, 68);
  doc.circle(width - MARGIN - 54, 8.8, 1.2, 'F');
  doc.text('Neutral', width - MARGIN - 28, 10);
  doc.setFillColor(100, 116, 139);
  doc.circle(width - MARGIN - 34, 8.8, 1.2, 'F');
  doc.text('Positive', width - MARGIN - 8, 10);
  doc.setFillColor(52, 211, 153);
  doc.circle(width - MARGIN - 14, 8.8, 1.2, 'F');

  const dayHeaders = (heatmapRows[0]?.days || []).map((day) => `D${day.day}`);
  const dayCount = dayHeaders.length || 1;
  const regionWidth = 36;
  const dayCellWidth = (width - MARGIN * 2 - regionWidth) / dayCount;
  const tableTop = headerBottom + 2;
  const tableBottom = height - FOOTER_Y_OFFSET - 4;
  const availableTableHeight = tableBottom - tableTop;
  const minCellHeight = Math.max(10, availableTableHeight / (heatmapRows.length + 1));

  const tableBody = heatmapRows.map((row) => {
    const regionMeta = `Avg ${Math.round((Number(row.average) || 0) * 100)} | Vol ${Math.round((Number(row.volatility) || 0) * 100)}`;
    return [
      `${row.region}\n${regionMeta}`,
      ...(row.days || []).map((day) => `${scoreLabel(day.score)}\n${day.count ?? 0}`),
    ];
  });

  const columnStyles = {
    0: {
      cellWidth: regionWidth,
      fillColor: [2, 6, 23],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      valign: 'middle',
    },
  };

  for (let index = 1; index <= dayCount; index += 1) {
    columnStyles[index] = {
      cellWidth: dayCellWidth,
      halign: 'center',
      valign: 'middle',
    };
  }

  autoTable(doc, {
    startY: tableTop,
    tableWidth: width - MARGIN * 2,
    head: [['Region', ...dayHeaders]],
    body: tableBody,
    styles: {
      fontSize: Math.min(8, Math.max(5.5, minCellHeight / 4)),
      cellPadding: 1.5,
      overflow: 'linebreak',
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineColor: [255, 255, 255],
      lineWidth: 0.05,
      minCellHeight,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [148, 163, 184],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: Math.min(12, minCellHeight),
    },
    columnStyles,
    margin: { left: MARGIN, right: MARGIN, top: tableTop, bottom: FOOTER_Y_OFFSET + 2 },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index === 0) return;

      const rowIndex = data.row.index;
      const dayIndex = data.column.index - 1;
      const day = heatmapRows[rowIndex]?.days?.[dayIndex];
      if (!day) return;

      data.cell.styles.fillColor = scoreToRgb(day.score);
      data.cell.styles.textColor = [255, 255, 255];
      data.cell.styles.halign = 'center';
      data.cell.styles.valign = 'middle';
    },
  });
};

const drawReactionsSection = (doc, result) => {
  const reactions = (result.sample_posts || result.reactions || []).slice(0, 8);
  if (reactions.length === 0) return;

  doc.addPage('a4', 'portrait');
  const width = pageWidth(doc);
  const startY = drawPageHeader(doc, new Date().toISOString().slice(0, 16).replace('T', ' '));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Sample AI Persona Reactions', MARGIN, startY + 2);
  doc.setDrawColor(105, 210, 233);
  doc.line(MARGIN, startY + 4, width - MARGIN, startY + 4);

  const tableTop = startY + 8;
  const tableBottom = pageHeight(doc) - FOOTER_Y_OFFSET - 4;
  const minCellHeight = Math.max(18, (tableBottom - tableTop - 10) / (reactions.length + 1));

  autoTable(doc, {
    startY: tableTop,
    tableWidth: width - MARGIN * 2,
    head: [['Persona', 'Sentiment', 'Reaction']],
    body: reactions.map((item, index) => [
      item.personaName || item.persona || `Persona ${index + 1}`,
      item.sentiment || 'neutral',
      item.postContent || item.post || item.comments || 'No reaction text returned.',
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      textColor: [30, 41, 59],
      valign: 'top',
      minCellHeight,
    },
    headStyles: {
      fillColor: [5, 8, 22],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
};

export const downloadSimulationResultPdf = async (result) => {
  if (!result) {
    throw new Error('No simulation result available to export.');
  }

  const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawPageHeader(doc, generatedAt);
  y = drawMetaAndMetrics(doc, result, y);
  drawSummarySection(doc, result, y);

  if ((result.heatmapMatrix || []).length > 0) {
    drawHeatmapSection(doc, result);
  }

  drawReactionsSection(doc, result);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    drawFooter(doc, page, pageCount);
  }

  const pdfBlob = doc.output('blob');
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'simulation-report.pdf';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};
