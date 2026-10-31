/**
 * Pure TypeScript Standards-Compliant PDF 1.4 Generator
 * Zero-dependency, memory-efficient, deterministically formats professional reports.
 */

export interface PdfTableColumn {
  header: string;
  width: number; // in points
  align?: 'left' | 'right' | 'center';
}

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  eventName: string;
  reportType: string;
  generatedAt?: string;
  authorName?: string;
  currency?: string;
}

export class SimplePdfDocument {
  private pages: string[] = [''];
  private currentPage = 0;
  private readonly pageWidth = 612; // 8.5 inches at 72 dpi
  private readonly pageHeight = 792; // 11 inches at 72 dpi
  private readonly marginX = 45;
  private readonly marginTop = 45;
  private readonly marginBottom = 45;
  private cursorY = 45; // Starts at top margin, increases downwards
  private readonly contentWidth: number;

  constructor() {
    this.contentWidth = this.pageWidth - this.marginX * 2;
  }

  private escapePdfText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' '); // Keep printable Latin-1 / ASCII
  }

  private toPdfY(y: number): number {
    return this.pageHeight - y;
  }

  private appendOp(op: string): void {
    this.pages[this.currentPage] += op + '\n';
  }

  public checkPageBreak(requiredHeight: number): void {
    if (this.cursorY + requiredHeight > this.pageHeight - this.marginBottom) {
      this.addPage();
    }
  }

  public addPage(): void {
    this.pages.push('');
    this.currentPage++;
    this.cursorY = this.marginTop;
  }

  public addSpacer(points: number): void {
    this.cursorY += points;
    this.checkPageBreak(0);
  }

  public drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fillRgb?: [number, number, number],
    strokeRgb?: [number, number, number],
    lineWidth = 1
  ): void {
    const pdfY = this.toPdfY(y + height);
    let op = `q\n${lineWidth} w\n`;
    if (strokeRgb) {
      op += `${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG\n`;
    }
    if (fillRgb) {
      op += `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg\n`;
    }
    op += `${x} ${pdfY} ${width} ${height} re\n`;
    if (fillRgb && strokeRgb) {
      op += 'B\n';
    } else if (fillRgb) {
      op += 'f\n';
    } else if (strokeRgb) {
      op += 'S\n';
    }
    op += 'Q';
    this.appendOp(op);
  }

  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeRgb: [number, number, number] = [0.8, 0.8, 0.8],
    lineWidth = 0.75
  ): void {
    const pdfY1 = this.toPdfY(y1);
    const pdfY2 = this.toPdfY(y2);
    const op = `q\n${lineWidth} w\n${strokeRgb[0]} ${strokeRgb[1]} ${strokeRgb[2]} RG\n${x1} ${pdfY1} m\n${x2} ${pdfY2} l\nS\nQ`;
    this.appendOp(op);
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      font?: 'F1' | 'F2' | 'F3'; // F1 = Helvetica, F2 = Helvetica-Bold, F3 = Helvetica-Oblique
      color?: [number, number, number];
      align?: 'left' | 'right' | 'center';
      width?: number;
    } = {}
  ): void {
    const fontSize = options.fontSize || 10;
    const font = options.font || 'F1';
    const color = options.color || [0.1, 0.1, 0.1];
    const align = options.align || 'left';
    const escaped = this.escapePdfText(text);

    let startX = x;
    const approxCharWidth = fontSize * 0.52;
    const textWidth = escaped.length * approxCharWidth;

    if (align === 'right' && options.width) {
      startX = x + options.width - textWidth;
    } else if (align === 'center' && options.width) {
      startX = x + (options.width - textWidth) / 2;
    }

    const pdfY = this.toPdfY(y);
    const op = `BT\n/${font} ${fontSize} Tf\n${color[0]} ${color[1]} ${color[2]} rg\n${startX} ${pdfY} Td\n(${escaped}) Tj\nET`;
    this.appendOp(op);
  }

  public addHeader(options: PdfReportOptions): void {
    // Top amber accent bar
    this.drawRect(this.marginX, this.cursorY, this.contentWidth, 4, [0.85, 0.45, 0.1]);
    this.cursorY += 14;

    // Platform title & Report badge
    this.drawText('CELEBRA PLATFORM REPORT', this.marginX, this.cursorY, {
      font: 'F2',
      fontSize: 10,
      color: [0.85, 0.45, 0.1],
    });

    const badgeWidth = 140;
    const badgeX = this.marginX + this.contentWidth - badgeWidth;
    this.drawRect(badgeX, this.cursorY - 8, badgeWidth, 16, [0.96, 0.94, 0.9], [0.85, 0.75, 0.65]);
    this.drawText('OFFICIAL AUDIT EXPORT', badgeX, this.cursorY + 3, {
      font: 'F2',
      fontSize: 8,
      color: [0.4, 0.25, 0.1],
      align: 'center',
      width: badgeWidth,
    });
    this.cursorY += 18;

    // Document Main Title
    this.drawText(options.title, this.marginX, this.cursorY, {
      font: 'F2',
      fontSize: 18,
      color: [0.1, 0.1, 0.12],
    });
    this.cursorY += 16;

    if (options.subtitle) {
      this.drawText(options.subtitle, this.marginX, this.cursorY, {
        font: 'F1',
        fontSize: 10,
        color: [0.35, 0.35, 0.4],
      });
      this.cursorY += 14;
    }

    // Metadata card box
    const cardHeight = 36;
    this.drawRect(
      this.marginX,
      this.cursorY,
      this.contentWidth,
      cardHeight,
      [0.98, 0.98, 0.99],
      [0.85, 0.85, 0.88]
    );

    const colW = this.contentWidth / 4;
    const metaY = this.cursorY + 12;

    // Col 1: Event
    this.drawText('CELEBRATION', this.marginX + 8, metaY, { font: 'F2', fontSize: 7, color: [0.5, 0.5, 0.5] });
    this.drawText(options.eventName.substring(0, 24), this.marginX + 8, metaY + 14, { font: 'F2', fontSize: 9 });

    // Col 2: Report Type
    this.drawText('REPORT TYPE', this.marginX + colW + 8, metaY, { font: 'F2', fontSize: 7, color: [0.5, 0.5, 0.5] });
    this.drawText(options.reportType.substring(0, 24), this.marginX + colW + 8, metaY + 14, { font: 'F1', fontSize: 9 });

    // Col 3: Generated Date
    const genDate = options.generatedAt || new Date().toISOString().split('T')[0];
    this.drawText('EXPORT TIMESTAMP', this.marginX + colW * 2 + 8, metaY, { font: 'F2', fontSize: 7, color: [0.5, 0.5, 0.5] });
    this.drawText(genDate, this.marginX + colW * 2 + 8, metaY + 14, { font: 'F1', fontSize: 9 });

    // Col 4: Classification
    this.drawText('DATA SECURITY', this.marginX + colW * 3 + 8, metaY, { font: 'F2', fontSize: 7, color: [0.5, 0.5, 0.5] });
    this.drawText('CONFIDENTIAL / ROLE RBAC', this.marginX + colW * 3 + 8, metaY + 14, { font: 'F2', fontSize: 8, color: [0.2, 0.5, 0.2] });

    this.cursorY += cardHeight + 16;
  }

  public addSectionHeading(title: string): void {
    this.checkPageBreak(32);
    this.drawRect(this.marginX, this.cursorY, 3, 14, [0.85, 0.45, 0.1]);
    this.drawText(title.toUpperCase(), this.marginX + 10, this.cursorY + 11, {
      font: 'F2',
      fontSize: 12,
      color: [0.15, 0.15, 0.2],
    });
    this.cursorY += 18;
    this.drawLine(this.marginX, this.cursorY, this.marginX + this.contentWidth, this.cursorY, [0.88, 0.88, 0.9]);
    this.cursorY += 10;
  }

  public addParagraph(text: string, options: { fontSize?: number; italic?: boolean } = {}): void {
    const fontSize = options.fontSize || 9;
    const font = options.italic ? 'F3' : 'F1';
    const lineHeight = fontSize + 4;

    const words = text.split(' ');
    let currentLine = '';
    const maxChars = Math.floor(this.contentWidth / (fontSize * 0.5));

    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxChars) {
        this.checkPageBreak(lineHeight);
        this.drawText(currentLine.trim(), this.marginX, this.cursorY, { font, fontSize, color: [0.2, 0.2, 0.25] });
        this.cursorY += lineHeight;
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }

    if (currentLine.trim()) {
      this.checkPageBreak(lineHeight);
      this.drawText(currentLine.trim(), this.marginX, this.cursorY, { font, fontSize, color: [0.2, 0.2, 0.25] });
      this.cursorY += lineHeight;
    }

    this.cursorY += 6;
  }

  public addKeyMetricCards(
    cards: Array<{ label: string; value: string; helper?: string; color?: [number, number, number] }>
  ): void {
    this.checkPageBreak(50);
    const cardWidth = (this.contentWidth - (cards.length - 1) * 8) / cards.length;
    const cardHeight = 44;

    cards.forEach((card, i) => {
      const cardX = this.marginX + i * (cardWidth + 8);
      this.drawRect(cardX, this.cursorY, cardWidth, cardHeight, [0.98, 0.98, 0.99], [0.86, 0.86, 0.88]);

      this.drawText(card.label.toUpperCase(), cardX + 8, this.cursorY + 12, {
        font: 'F2',
        fontSize: 7,
        color: [0.5, 0.5, 0.55],
      });

      this.drawText(card.value, cardX + 8, this.cursorY + 28, {
        font: 'F2',
        fontSize: 13,
        color: card.color || [0.1, 0.1, 0.15],
      });

      if (card.helper) {
        this.drawText(card.helper, cardX + 8, this.cursorY + 38, {
          font: 'F1',
          fontSize: 7,
          color: [0.45, 0.45, 0.5],
        });
      }
    });

    this.cursorY += cardHeight + 14;
  }

  public addTable(columns: PdfTableColumn[], rows: Array<Array<string | number>>): void {
    const rowHeight = 18;
    const headerHeight = 20;

    this.checkPageBreak(headerHeight + rowHeight);

    // Draw Table Header
    this.drawRect(this.marginX, this.cursorY, this.contentWidth, headerHeight, [0.93, 0.94, 0.96], [0.8, 0.82, 0.85]);

    let curX = this.marginX;
    columns.forEach((col) => {
      this.drawText(col.header.toUpperCase(), curX + 4, this.cursorY + 13, {
        font: 'F2',
        fontSize: 8,
        color: [0.2, 0.22, 0.25],
        align: col.align,
        width: col.width - 8,
      });
      curX += col.width;
    });

    this.cursorY += headerHeight;

    // Draw Rows
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight);

      const isZebra = rowIndex % 2 === 1;
      if (isZebra) {
        this.drawRect(this.marginX, this.cursorY, this.contentWidth, rowHeight, [0.98, 0.98, 0.99]);
      }
      this.drawLine(this.marginX, this.cursorY + rowHeight, this.marginX + this.contentWidth, this.cursorY + rowHeight, [0.9, 0.9, 0.92]);

      let rowX = this.marginX;
      columns.forEach((col, colIndex) => {
        const val = row[colIndex] !== undefined && row[colIndex] !== null ? String(row[colIndex]) : '';
        // Truncate if too long for column
        const maxChars = Math.max(3, Math.floor((col.width - 8) / 4.8));
        const displayVal = val.length > maxChars ? val.substring(0, maxChars - 2) + '..' : val;

        this.drawText(displayVal, rowX + 4, this.cursorY + 12, {
          font: 'F1',
          fontSize: 8,
          color: [0.2, 0.2, 0.2],
          align: col.align,
          width: col.width - 8,
        });

        rowX += col.width;
      });

      this.cursorY += rowHeight;
    });

    this.cursorY += 10;
  }

  private addFooters(): void {
    const totalPages = this.pages.length;
    for (let i = 0; i < totalPages; i++) {
      const footerY = this.pageHeight - this.marginBottom + 12;
      const pdfY = this.marginBottom - 16;
      const op = `
q
0.75 w
0.85 0.85 0.88 RG
${this.marginX} ${pdfY + 14} m
${this.marginX + this.contentWidth} ${pdfY + 14} l
S
Q
BT
/F1 8 Tf
0.5 0.5 0.5 rg
${this.marginX} ${pdfY} Td
(CELEBRA Platform Official Report | Immutable Server-Side Render | Confidential) Tj
ET
BT
/F2 8 Tf
0.5 0.5 0.5 rg
${this.marginX + this.contentWidth - 60} ${pdfY} Td
(Page ${i + 1} of ${totalPages}) Tj
ET`;
      this.pages[i] += op + '\n';
    }
  }

  /**
   * Compiles and serializes the complete document into an RFC-compliant PDF 1.4 binary Buffer.
   */
  public buildPdf(): Buffer {
    this.addFooters();

    const objects: string[] = [];
    const offsets: number[] = [];

    // Helper to add object and track byte offset
    const addObject = (content: string): number => {
      const id = objects.length + 1;
      objects.push(`${id} 0 obj\n${content}\nendobj\n`);
      return id;
    };

    // Obj 1: Catalog
    addObject('<< /Type /Catalog /Pages 2 0 R >>');

    // Obj 2: Pages tree placeholder (will be resolved after page objects)
    const pagesObjIndex = objects.length;
    objects.push(''); // placeholder for Pages object

    // Font Objects: Helvetica, Helvetica-Bold, Helvetica-Oblique
    const font1Id = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const font2Id = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const font3Id = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');

    // Page Objects and Content Streams
    const pageObjIds: number[] = [];

    for (let i = 0; i < this.pages.length; i++) {
      const contentStream = this.pages[i];
      const streamLen = Buffer.byteLength(contentStream, 'latin1');
      const streamObjId = addObject(
        `<< /Length ${streamLen} >>\nstream\n${contentStream}\nendstream`
      );

      const pageObjId = addObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R /F3 ${font3Id} 0 R >> >> /Contents ${streamObjId} 0 R >>`
      );
      pageObjIds.push(pageObjId);
    }

    // Now populate Pages Tree Obj 2
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    objects[pagesObjIndex] = `2 0 obj\n<< /Type /Pages /Kids [ ${kidsStr} ] /Count ${pageObjIds.length} >>\nendobj\n`;

    // Construct final buffer and calculate cross reference table
    let body = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    let currentOffset = Buffer.byteLength(body, 'latin1');

    for (let i = 0; i < objects.length; i++) {
      offsets.push(currentOffset);
      const objStr = objects[i];
      body += objStr;
      currentOffset += Buffer.byteLength(objStr, 'latin1');
    }

    // XRef Table
    const startXref = currentOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \r\n`;
    for (const offset of offsets) {
      const padded = String(offset).padStart(10, '0');
      xref += `${padded} 00000 n \r\n`;
    }

    // Trailer
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

    const fullPdfStr = body + xref + trailer;
    return Buffer.from(fullPdfStr, 'latin1');
  }
}
