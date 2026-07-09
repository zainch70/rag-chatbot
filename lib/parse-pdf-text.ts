type PdfParserData = {
  Pages: Array<{
    Texts: Array<{
      R: Array<{ T: string }>;
    }>;
  }>;
};

export function parsePdfDataToText(pdfData: PdfParserData) {
  const text = pdfData.Pages.map((page) =>
    page.Texts.map((textItem) =>
      textItem.R.map((run) => decodeURIComponent(run.T)).join("")
    ).join("")
  ).join("\n\n");

  return text.trim();
}
