/**
 * Creates the placeholder release form PDF.
 * Replace release-forms/release-form.pdf with your real form when ready.
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const OUT_DIR = path.join(__dirname, '..', 'release-forms');
const OUT_FILE = path.join(OUT_DIR, 'release-form.pdf');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const margin = 50;
  let y = height - margin;

  const drawText = (text, size = 12) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= size + 4;
  };

  page.drawText('NeuroWaves — Release & Waiver of Liability', {
    x: margin,
    y,
    size: 18,
    font: await doc.embedFont(StandardFonts.HelveticaBold),
    color: rgb(0.3, 0.2, 0.45),
  });
  y -= 28;

  drawText('PLACEHOLDER FORM', 14);
  drawText('This is a placeholder. Replace the file release-forms/release-form.pdf with your official release form.', 10);
  y -= 16;
  drawText('Participants will receive this file by email when they sign up. They should fill it out and bring it on race day.', 10);
  y -= 24;
  drawText('Instructions:', 12);
  drawText('1. Replace this PDF with your actual waiver/release form.');
  drawText('2. Keep the filename: release-form.pdf');
  drawText('3. Restart the server if it is running.');
  y -= 16;
  drawText('— The NeuroWaves Project', 10);

  const pdfBytes = await doc.save();
  fs.writeFileSync(OUT_FILE, pdfBytes);
  console.log('Created:', OUT_FILE);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
