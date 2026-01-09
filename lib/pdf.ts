/**
 * PDF Generation Utility
 *
 * Client-side PDF generation using html2canvas and jsPDF.
 * Used for downloading booking confirmations and quote summaries.
 */

/**
 * Generate a PDF from an HTML element and trigger download
 *
 * @param elementId - The ID of the HTML element to capture
 * @param filename - The filename for the downloaded PDF (without extension)
 * @returns Promise that resolves when download is triggered
 */
export async function generatePdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${filename}.pdf`);
}
