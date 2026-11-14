export type SheetValue = string | number | null | undefined;

export interface ExcelExportOptions {
  fileName: string;
  sheetName: string;
  title: string;
  subtitle?: string;
  headers: string[];
  rows: SheetValue[][];
  sectionRows?: number[];
  totalRows?: number[];
}

const xml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const columnName = (index: number) => {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
};

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

function zipStore(files: { name: string; contents: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const u16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const u32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.contents);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    u32(localView, 0, 0x04034b50); u16(localView, 4, 20); u16(localView, 6, 0x0800);
    u16(localView, 8, 0); u16(localView, 10, 0); u16(localView, 12, 0);
    u32(localView, 14, checksum); u32(localView, 18, data.length); u32(localView, 22, data.length);
    u16(localView, 26, name.length); u16(localView, 28, 0); local.set(name, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    u32(centralView, 0, 0x02014b50); u16(centralView, 4, 20); u16(centralView, 6, 20);
    u16(centralView, 8, 0x0800); u16(centralView, 10, 0); u16(centralView, 12, 0); u16(centralView, 14, 0);
    u32(centralView, 16, checksum); u32(centralView, 20, data.length); u32(centralView, 24, data.length);
    u16(centralView, 28, name.length); u16(centralView, 30, 0); u16(centralView, 32, 0);
    u16(centralView, 34, 0); u16(centralView, 36, 0); u32(centralView, 38, 0); u32(centralView, 42, offset);
    central.set(name, 46); centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  u32(endView, 0, 0x06054b50); u16(endView, 4, 0); u16(endView, 6, 0);
  u16(endView, 8, files.length); u16(endView, 10, files.length);
  u32(endView, 12, centralSize); u32(endView, 16, offset); u16(endView, 20, 0);
  const chunks = [...localParts, ...centralParts, end];
  const combined = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let cursor = 0;
  for (const chunk of chunks) { combined.set(chunk, cursor); cursor += chunk.length; }
  return new Blob([combined.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadExcel(options: ExcelExportOptions) {
  const { headers, rows } = options;
  const columnCount = Math.max(1, headers.length);
  const lastColumn = columnName(columnCount - 1);
  const sectionRows = new Set(options.sectionRows || []);
  const totalRows = new Set(options.totalRows || []);
  const worksheetRows: SheetValue[][] = [[options.title], [options.subtitle || `Generated ${new Date().toLocaleString()}`], [], headers, ...rows];
  const headerRow = 4;
  const dataStartRow = headerRow + 1;
  const finalRow = worksheetRows.length;

  const cellXml = (value: SheetValue, rowNumber: number, column: number, style: number) => {
    const reference = `${columnName(column)}${rowNumber}`;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const numericStyle = style === 0 ? 4 : style;
      return `<c r="${reference}" s="${numericStyle}"><v>${value}</v></c>`;
    }
    const text = xml(value);
    return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
  };

  const sheetRows = worksheetRows.map((cells, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const rowStyle = rowIndex === 0 ? 1 : rowIndex === 3 ? 2 : 0;
    if (rowIndex === 0) return `<row r="1" ht="30" customHeight="1">${cellXml(cells[0], rowNumber, 0, 1)}</row>`;
    if (rowIndex === 1) return `<row r="2" ht="22" customHeight="1">${cellXml(cells[0], rowNumber, 0, 5)}</row>`;
    if (rowIndex === 2) return `<row r="3" ht="8" customHeight="1"/>`;
    const dataIndex = rowIndex - dataStartRow;
    const style = rowIndex === 3 ? rowStyle : sectionRows.has(dataIndex) ? 5 : totalRows.has(dataIndex) ? 3 : 0;
    return `<row r="${rowNumber}">${cells.map((value, column) => cellXml(value, rowNumber, column, style)).join('')}</row>`;
  }).join('');

  const widths = headers.map((header, column) => {
    const longest = Math.max(header.length, ...rows.map(row => String(row[column] ?? '').length));
    return `<col min="${column + 1}" max="${column + 1}" width="${Math.min(48, Math.max(12, longest + 2))}" customWidth="1"/>`;
  }).join('');
  const autoFilterEnd = Math.max(headerRow, headerRow + rows.length - (totalRows.has(rows.length - 1) ? 1 : 0));
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${finalRow}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/><cols>${widths}</cols><sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A${headerRow}:${lastColumn}${autoFilterEnd}"/><mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##;[Red]-#,##0.##"/></numFmts>
  <fonts count="3"><font><sz val="10"/><name val="Aptos"/><color rgb="FF24304A"/></font><font><b/><sz val="18"/><name val="Aptos Display"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font></fonts>
  <fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF172554"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF435BD6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF0FF"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD8DEEB"/></left><right style="thin"><color rgb="FFD8DEEB"/></right><top style="thin"><color rgb="FFD8DEEB"/></top><bottom style="thin"><color rgb="FFD8DEEB"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const safeSheetName = options.sheetName.replace(/[\\/*?:\[\]]/g, ' ').slice(0, 31) || 'Report';
  const files = [
    { name: '[Content_Types].xml', contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: '_rels/.rels', contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', contents: styles },
    { name: 'xl/worksheets/sheet1.xml', contents: worksheet },
  ];

  const blob = zipStore(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.fileName.toLowerCase().endsWith('.xlsx') ? options.fileName : `${options.fileName}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openPrintDocument(title: string, subtitle: string, body: string, landscape = true) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const safeTitle = xml(title);
  const safeSubtitle = xml(subtitle);
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${safeTitle}</title><style>
    @page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:14mm}*{box-sizing:border-box}body{margin:0;color:#172033;background:#fff;font:12px/1.5 Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .report-head{border-bottom:3px solid #435bd6;padding:0 0 14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}.brand{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#435bd6}.report-head h1{font-size:24px;margin:5px 0 2px;color:#172554}.report-head p{margin:0;color:#64748b}.generated{font-size:10px;color:#64748b;text-align:right;white-space:nowrap}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:10px}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #d9dfeb;padding:7px 9px;text-align:left;vertical-align:top}th{background:#435bd6!important;color:#fff;font-size:9px;letter-spacing:.04em;text-transform:uppercase}tbody tr:nth-child(even){background:#f4f6fb!important}tfoot td{font-weight:700;background:#eaf0ff!important}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.summary-card{border:1px solid #d9dfeb;border-radius:8px;padding:10px}.summary-card span{display:block;color:#64748b;font-size:9px;text-transform:uppercase}.summary-card strong{display:block;color:#172554;font-size:15px;margin-top:4px}.section{margin:18px 0;break-inside:avoid}.section h2{color:#172554;font-size:14px;border-bottom:1px solid #d9dfeb;padding-bottom:6px}.report-foot{border-top:1px solid #d9dfeb;margin-top:24px;padding-top:8px;color:#64748b;font-size:9px;display:flex;justify-content:space-between}.no-print{display:none!important}
    @media screen{body{max-width:1100px;margin:28px auto;padding:0 28px}.print-action{position:fixed;right:24px;top:18px;background:#435bd6;color:#fff;border:0;border-radius:7px;padding:10px 16px;cursor:pointer;font-weight:700}.report-head{padding-right:110px}}
    @media print{.print-action{display:none}.report-foot{position:running(footer)}}
  </style></head><body><button class="print-action" onclick="window.print()">Print / Save as PDF</button><header class="report-head"><div><div class="brand">Indigo ERP · Nile Horizon Technologies</div><h1>${safeTitle}</h1><p>${safeSubtitle}</p></div><div class="generated">Generated<br/>${xml(new Date().toLocaleString())}</div></header>${body}<footer class="report-foot"><span>Confidential · Internal use only</span><span>Indigo ERP</span></footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));window.addEventListener('afterprint',()=>window.close());</script></body></html>`);
  printWindow.document.close();
  return true;
}

export function printableTable(headers: string[], rows: SheetValue[][], totals?: SheetValue[]) {
  const th = headers.map(header => `<th>${xml(header)}</th>`).join('');
  const body = rows.map(row => `<tr>${headers.map((_, index) => `<td>${xml(row[index])}</td>`).join('')}</tr>`).join('');
  const foot = totals ? `<tfoot><tr>${totals.map(value => `<td>${xml(value)}</td>`).join('')}</tr></tfoot>` : '';
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
}
