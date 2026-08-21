import { jsPDF } from 'jspdf';

export interface CertificateAward {
  id: string;
  title: string;
  description: string;
  icon?: string;
  color?: string;
}

const NAVY: [number, number, number] = [18, 52, 86];
const TEAL: [number, number, number] = [20, 110, 120];
const TEAL_DEEP: [number, number, number] = [12, 70, 90];
const GOLD: [number, number, number] = [201, 162, 39];
const GOLD_LIGHT: [number, number, number] = [232, 201, 92];
const INK: [number, number, number] = [28, 28, 28];
const MUTED: [number, number, number] = [120, 120, 120];

function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Title-case full name while keeping multi-word names intact. */
export function formatFullName(raw?: string | null) {
  const cleaned = (raw || 'Student').replace(/\s+/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((part) => {
      if (!part) return part;
      // Keep short particles lowercase if mid-name (optional nicety)
      const lower = part.toLowerCase();
      if (['de', 'dela', 'del', 'da', 'van', 'of'].includes(lower)) return lower;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function drawSuperElegantBackground(doc: jsPDF, pageW: number, pageH: number) {
  // Ultra premium cream/parchment background
  doc.setFillColor(253, 251, 246);
  doc.rect(0, 0, pageW, pageH, 'F');
  
  // Intricate watermark / Guilloche pattern in the center
  doc.setDrawColor(246, 241, 228);
  doc.setLineWidth(0.5);
  const cx = pageW / 2;
  const cy = pageH / 2;
  
  // Guilloche rosette
  for(let i=0; i<360; i+= 4) {
    const angle = i * Math.PI / 180;
    const r1 = 200;
    const r2 = 65;
    
    // Complex curve
    const x1 = cx + (r1 - r2) * Math.cos(angle) + r2 * Math.cos((r1 - r2) * angle / r2);
    const y1 = cy + (r1 - r2) * Math.sin(angle) - r2 * Math.sin((r1 - r2) * angle / r2);
    
    const x2 = cx + r1 * Math.cos(angle);
    const y2 = cy + r1 * Math.sin(angle);
    
    doc.line(cx, cy, x1, y1);
    doc.circle(x2, y2, 2, 'S');
  }

  // Outer border system
  // 1. Thick dark blue border
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(8);
  doc.rect(30, 30, pageW - 60, pageH - 60, 'S');
  
  // 2. Inner gold borders
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2.5);
  doc.rect(42, 42, pageW - 84, pageH - 84, 'S');
  doc.setLineWidth(0.5);
  doc.rect(47, 47, pageW - 94, pageH - 94, 'S');
  
  // 3. Very faint inner border line
  doc.setDrawColor(...GOLD_LIGHT);
  doc.rect(54, 54, pageW - 108, pageH - 108, 'S');

  // Corner ornaments
  doc.setFillColor(...NAVY);
  const corners = [
    [30, 30], [pageW - 30, 30], [pageW - 30, pageH - 30], [30, pageH - 30]
  ];
  corners.forEach(([x, y]) => {
    // A diamond at the corner
    doc.path([
      {op: 'm', c: [x, y - 10]},
      {op: 'l', c: [x + 10, y]},
      {op: 'l', c: [x, y + 10]},
      {op: 'l', c: [x - 10, y]},
      {op: 'h', c: []}
    ]).fill();
  });
  
  // Fancy intricate corners
  const offset = 47;
  const size = 65;
  doc.setDrawColor(...GOLD);
  
  const drawCorner = (x: number, y: number, mx: number, my: number) => {
    doc.setLineWidth(1.5);
    doc.path([
      {op: 'm', c: [x + mx * size, y]},
      {op: 'c', c: [x + mx * (size - 15), y, x, y + my * (size - 15), x, y + my * size]}
    ]).stroke();
    
    doc.setLineWidth(0.5);
    doc.path([
      {op: 'm', c: [x + mx * (size - 5), y + my * 5]},
      {op: 'c', c: [x + mx * (size - 25), y + my * 5, x + mx * 5, y + my * (size - 25), x + mx * 5, y + my * (size - 5)]}
    ]).stroke();
    
    // Tiny decorative dots
    doc.setFillColor(...GOLD);
    doc.circle(x + mx * size, y, 2.5, 'F');
    doc.circle(x, y + my * size, 2.5, 'F');
    doc.circle(x + mx * 12, y + my * 12, 2.5, 'F');
  };

  drawCorner(offset, offset, 1, 1);
  drawCorner(pageW - offset, offset, -1, 1);
  drawCorner(offset, pageH - offset, 1, -1);
  drawCorner(pageW - offset, pageH - offset, -1, -1);
}

function drawCurvedText(doc: jsPDF, text: string, cx: number, cy: number, radius: number, angleCenterDeg: number, angleSpreadDeg: number, isBottom: boolean) {
  const chars = text.split('');
  const step = chars.length > 1 ? angleSpreadDeg / (chars.length - 1) : 0;
  
  for (let i = 0; i < chars.length; i++) {
    const angleDeg = isBottom 
      ? (angleCenterDeg + angleSpreadDeg / 2 - i * step) 
      : (angleCenterDeg - angleSpreadDeg / 2 + i * step);
      
    const angleRad = angleDeg * Math.PI / 180;
    const x = cx + Math.cos(angleRad) * radius;
    const y = cy + Math.sin(angleRad) * radius;
    const rotation = isBottom ? -(angleDeg - 90) : -(angleDeg + 90);
    
    doc.text(chars[i], x, y, { align: 'center', baseline: 'middle', angle: rotation });
  }
}

function drawUltraSeal(doc: jsPDF, cx: number, cy: number, scale: number = 1, imgData?: string) {
  // 1. Ribbon tails (dropping down)
  doc.setFillColor(...NAVY);
  // Left tail
  doc.path([
    { op: 'm', c: [cx - 22 * scale, cy + 20 * scale] },
    { op: 'l', c: [cx - 36 * scale, cy + 85 * scale] },
    { op: 'l', c: [cx - 22 * scale, cy + 70 * scale] },
    { op: 'l', c: [cx - 6 * scale, cy + 85 * scale] },
    { op: 'l', c: [cx - 6 * scale, cy + 20 * scale] },
    { op: 'h', c: [] }
  ]).fill();
  
  // Right tail
  doc.path([
    { op: 'm', c: [cx + 6 * scale, cy + 20 * scale] },
    { op: 'l', c: [cx + 6 * scale, cy + 85 * scale] },
    { op: 'l', c: [cx + 22 * scale, cy + 70 * scale] },
    { op: 'l', c: [cx + 36 * scale, cy + 85 * scale] },
    { op: 'l', c: [cx + 22 * scale, cy + 20 * scale] },
    { op: 'h', c: [] }
  ]).fill();

  // Add gold trim to the ribbons
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1 * scale);
  doc.line(cx - 31 * scale, cy + 20 * scale, cx - 31 * scale, cy + 75 * scale);
  doc.line(cx - 11 * scale, cy + 20 * scale, cx - 11 * scale, cy + 75 * scale);
  doc.line(cx + 11 * scale, cy + 20 * scale, cx + 11 * scale, cy + 75 * scale);
  doc.line(cx + 31 * scale, cy + 20 * scale, cx + 31 * scale, cy + 75 * scale);

  // 2. Outer golden sunburst/scallops
  doc.setFillColor(...GOLD);
  for (let i = 0; i < 40; i++) {
    const angle = i * 9 * Math.PI / 180;
    const rOuter = 60 * scale;
    const rInner = 45 * scale;
    doc.triangle(
      cx + Math.cos(angle - 0.08) * rInner, cy + Math.sin(angle - 0.08) * rInner,
      cx + Math.cos(angle + 0.08) * rInner, cy + Math.sin(angle + 0.08) * rInner,
      cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter,
      'F'
    );
  }

  // 3. Thick Gold Base
  doc.setFillColor(...GOLD_LIGHT);
  doc.circle(cx, cy, 52 * scale, 'F');
  
  // Outer Navy Ring
  doc.setFillColor(...NAVY);
  doc.circle(cx, cy, 46 * scale, 'F');

  // Inner Gold Ring
  doc.setFillColor(...GOLD);
  doc.circle(cx, cy, 39 * scale, 'F');

  // Navy Core
  doc.setFillColor(...NAVY);
  doc.circle(cx, cy, 36 * scale, 'F');

  // 4. Intricate inner detailing
  // A ring of tiny gold stars or dots in the outer navy ring
  doc.setFillColor(...GOLD_LIGHT);
  for (let i = 0; i < 45; i++) {
    const angle = i * 8 * Math.PI / 180;
    const r = 42.5 * scale;
    doc.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 0.8 * scale, 'F');
  }

  // A fine gold dashed line inside the navy core
  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.6 * scale);
  for (let i = 0; i < 60; i++) {
    const angle1 = i * 6 * Math.PI / 180;
    const angle2 = (i * 6 + 3) * Math.PI / 180;
    const r = 32 * scale;
    doc.line(
      cx + Math.cos(angle1) * r, cy + Math.sin(angle1) * r,
      cx + Math.cos(angle2) * r, cy + Math.sin(angle2) * r
    );
  }

  if (imgData) {
    const imgSize = 68 * scale;
    doc.addImage(imgData, 'PNG', cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);
  } else {
    // 5. Curved text inside seal
    doc.setTextColor(...GOLD_LIGHT);
    doc.setFont('times', 'bold');
    doc.setFontSize(9 * scale);
    drawCurvedText(doc, 'S R G', cx, cy, 25.5 * scale, -90, 60, false);
    doc.setFontSize(8.5 * scale);
    drawCurvedText(doc, 'OFFICIAL SEAL', cx, cy, 25.5 * scale, 90, 150, true);

    // 6. Magnificent Center Star with 3D effect
    const rStarOuter = 14 * scale;
    const rStarInner = rStarOuter / 2.5;
    const starPointsOuter = [];
    const starPointsInner = [];
    for (let i = 0; i < 5; i++) {
      const angleOuter = (i * 72 - 90) * Math.PI / 180;
      const angleInner = (i * 72 + 36 - 90) * Math.PI / 180;
      starPointsOuter.push([cx + Math.cos(angleOuter) * rStarOuter, cy + Math.sin(angleOuter) * rStarOuter]);
      starPointsInner.push([cx + Math.cos(angleInner) * rStarInner, cy + Math.sin(angleInner) * rStarInner]);
    }
    
    // Draw the star with alternating shades for a faceted 3D look
    for (let i = 0; i < 5; i++) {
      const pOuter = starPointsOuter[i];
      const pInner1 = starPointsInner[(i + 4) % 5]; // previous inner point
      const pInner2 = starPointsInner[i];           // next inner point
      const center = [cx, cy];

      // Left half of star point
      doc.setFillColor(...GOLD_LIGHT);
      doc.triangle(center[0], center[1], pOuter[0], pOuter[1], pInner1[0], pInner1[1], 'F');
      
      // Right half of star point
      doc.setFillColor(180, 140, 30); // darker gold
      doc.triangle(center[0], center[1], pOuter[0], pOuter[1], pInner2[0], pInner2[1], 'F');
    }

    // Tiny dot in the very center
    doc.setFillColor(...NAVY);
    doc.circle(cx, cy, 1.5 * scale, 'F');
  }
}

function drawRibbon(doc: jsPDF, cx: number, cy: number, text: string) {
  doc.setFont('helvetica', 'bold');
  const label = text.toUpperCase().replace(/\s+/g, ' ').trim();
  let fontSize = 16;
  doc.setFontSize(fontSize);
  const maxRibbonW = 520;
  const minRibbonW = 280;
  while (fontSize > 11 && doc.getTextWidth(label) > maxRibbonW - 70) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
  }
  const textW = doc.getTextWidth(label);
  const ribbonW = Math.min(Math.max(textW + 80, minRibbonW), maxRibbonW);
  const ribbonH = 42;
  
  const tailDrop = 14;
  const tailOffset = 25;
  const tailWidth = 45;

  doc.setFillColor(180, 140, 30); // darker gold

  // Left tail
  doc.path([
    {op: 'm', c: [cx - ribbonW/2 + tailOffset, cy + ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx - ribbonW/2 - tailWidth, cy + ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx - ribbonW/2 - tailWidth + 15, cy + tailDrop]},
    {op: 'l', c: [cx - ribbonW/2 - tailWidth, cy - ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx - ribbonW/2 + tailOffset, cy - ribbonH/2 + tailDrop]},
    {op: 'h', c: []}
  ]).fill();

  // Right tail
  doc.path([
    {op: 'm', c: [cx + ribbonW/2 - tailOffset, cy + ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx + ribbonW/2 + tailWidth, cy + ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx + ribbonW/2 + tailWidth - 15, cy + tailDrop]},
    {op: 'l', c: [cx + ribbonW/2 + tailWidth, cy - ribbonH/2 + tailDrop]},
    {op: 'l', c: [cx + ribbonW/2 - tailOffset, cy - ribbonH/2 + tailDrop]},
    {op: 'h', c: []}
  ]).fill();

  // Shadow/fold
  doc.setFillColor(130, 100, 20);
  // Left fold
  doc.triangle(
    cx - ribbonW/2 + tailOffset, cy + ribbonH/2,
    cx - ribbonW/2 + tailOffset, cy + ribbonH/2 + tailDrop,
    cx - ribbonW/2 + tailOffset + tailDrop, cy + ribbonH/2,
    'F'
  );
  // Right fold
  doc.triangle(
    cx + ribbonW/2 - tailOffset, cy + ribbonH/2,
    cx + ribbonW/2 - tailOffset, cy + ribbonH/2 + tailDrop,
    cx + ribbonW/2 - tailOffset - tailDrop, cy + ribbonH/2,
    'F'
  );

  // Main ribbon body
  doc.setFillColor(...GOLD);
  doc.rect(cx - ribbonW/2, cy - ribbonH/2, ribbonW, ribbonH, 'F');
  
  // Inner border
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.rect(cx - ribbonW/2 + 4, cy - ribbonH/2 + 4, ribbonW - 8, ribbonH - 8, 'S');

  // Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(fontSize);
  doc.text(label, cx, cy + 6, { align: 'center' });
}

function loadImageAsBase64(url: string, removeWhiteBackground = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');
      ctx.drawImage(img, 0, 0);

      if (removeWhiteBackground) {
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = image.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 238 && g > 238 && b > 238) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(image, 0, 0);
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Ultra-Premium Formal Certificate of Appreciation PDF.
 * Uses the student's full registered name and extreme attention to detail.
 */
export async function downloadAwardCertificate(opts: {
  studentName: string;
  award: CertificateAward;
  issuedAt?: Date;
}) {
  const { award, issuedAt = new Date() } = opts;
  const fullName = formatFullName(opts.studentName);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const cx = pageW / 2;

  // Background and borders
  drawSuperElegantBackground(doc, pageW, pageH);

  // Title with shadow effect
  doc.setFont('times', 'bold');
  doc.setFontSize(54);
  doc.setTextColor(215, 200, 150); // Shadow color
  const titleText = 'C E R T I F I C A T E';
  doc.text(titleText, cx + 2, 122, { align: 'center' });
  doc.setTextColor(...NAVY);
  doc.text(titleText, cx, 120, { align: 'center' });

  doc.setTextColor(...GOLD);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('O  F     E  X  C  E  L  L  E  N  C  E', cx, 154, { align: 'center' });

  // Subtitle
  doc.setTextColor(...MUTED);
  doc.setFont('times', 'italic');
  doc.setFontSize(16);
  doc.text('This certificate is proudly presented to', cx, 195, { align: 'center' });

  // Recipient Name
  doc.setTextColor(...INK);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(48);
  doc.text(fullName, cx, 246, { align: 'center' });

  // Elegant line under name with center diamond
  const nameW = Math.min(Math.max(doc.getTextWidth(fullName) + 60, 300), 600);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(cx - nameW / 2, 260, cx - 15, 260);
  doc.line(cx + 15, 260, cx + nameW / 2, 260);
  
  doc.setFillColor(...GOLD);
  doc.path([
    {op: 'm', c: [cx, 260 - 5]},
    {op: 'l', c: [cx + 5, 260]},
    {op: 'l', c: [cx, 260 + 5]},
    {op: 'l', c: [cx - 5, 260]},
    {op: 'h', c: []}
  ]).fill();

  // Award Reason
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`In recognition of outstanding achievement in unlocking the:`, cx, 296, { align: 'center' });
  
  // Ribbon for the award title
  drawRibbon(doc, cx, 340, award.title);

  doc.setTextColor(...INK);
  doc.setFont('times', 'italic');
  doc.setFontSize(14);
  const body = doc.splitTextToSize(
    award.description
      ? `${award.description} Story Race Game commends your continuous dedication, growth, and excellence in your reading adventures.`
      : 'Story Race Game commends your continuous dedication, growth, and excellence in your reading adventures.',
    560
  );
  doc.text(body, cx, 396, { align: 'center', lineHeightFactor: 1.6 });

  // Footer / Seal / Signatures
  const footerY = pageH - 95;
  
  // Date
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1);
  doc.line(120, footerY, 280, footerY);
  doc.setTextColor(...INK);
  doc.setFont('times', 'normal');
  doc.setFontSize(14);
  doc.text(formatDate(issuedAt), 200, footerY - 12, { align: 'center' });
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('D A T E   A W A R D E D', 200, footerY + 16, { align: 'center' });

  // Seal with Logo Embedded
  const cy = footerY - 10;
  try {
    const imgData = await loadImageAsBase64('/774305900_27641489658835587_363435234290148032_n.jpg', true);
    drawUltraSeal(doc, cx, cy, 1.25, imgData);
  } catch (err) {
    console.error('Failed to load seal image, falling back to vector seal:', err);
    drawUltraSeal(doc, cx, cy, 1.25);
  }

  // Signature
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1);
  doc.line(pageW - 280, footerY, pageW - 120, footerY);
  
  // Fancy signature text
  doc.setTextColor(...NAVY);
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.text('Story Race Game', pageW - 200, footerY - 10, { align: 'center' });
  
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('A U T H O R I Z E D   S I G N A T U R E', pageW - 200, footerY + 16, { align: 'center' });

  const safeName = fullName.replace(/[^\w\-]+/g, '_').slice(0, 50);
  const safeAward = award.title.replace(/[^\w\-]+/g, '_').slice(0, 40);
  doc.save(`SRG_Certificate_${safeAward}_${safeName}.pdf`);
}
