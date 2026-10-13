package de.phstein.timesheet.service;

import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.Phrase;
import org.openpdf.text.pdf.ColumnText;
import org.openpdf.text.pdf.PdfContentByte;
import org.openpdf.text.pdf.PdfImportedPage;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.PdfTemplate;
import org.openpdf.text.pdf.PdfWriter;

public class PdfPageTemplateHelper extends PdfPageEventHelper {

    private final PdfReader templateReader;
    private final PdfFontService pdfFontService;
    private PdfTemplate totalPagesTemplate;

    public PdfPageTemplateHelper(PdfReader templateReader, PdfFontService pdfFontService) {
        this.templateReader = templateReader;
        this.pdfFontService = pdfFontService;
    }

    @Override
    public void onOpenDocument(PdfWriter writer, Document document) {
        totalPagesTemplate = writer.getDirectContent().createTemplate(30, 16);
    }

    @Override
    public void onEndPage(PdfWriter writer, Document document) {
        if (templateReader != null) {
            try {
                PdfImportedPage page = writer.getImportedPage(templateReader, 1);
                PdfContentByte background = writer.getDirectContentUnder();
                background.addTemplate(page, 0, 0);
            } catch (Exception e) {
                // Ignore or log error
            }
        }

        // Render page number footer ("Seite X/Y")
        PdfContentByte cb = writer.getDirectContent();
        Font footerFont = pdfFontService.getRegularFont(9f);
        String text = "Seite " + writer.getPageNumber() + "/";
        float textSize = pdfFontService.getBaseFontRegular().getWidthPoint(text, 9f);
        
        float x = document.right();
        float y = Math.max(12f, document.bottom() - 15f);

        ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase(text, footerFont), x - 12f, y, 0);
        cb.addTemplate(totalPagesTemplate, x - 12f, y);
    }

    @Override
    public void onCloseDocument(PdfWriter writer, Document document) {
        Font footerFont = pdfFontService.getRegularFont(9f);
        int totalPages = writer.getPageNumber() - 1;
        if (totalPages < 1) {
            totalPages = 1;
        }
        ColumnText.showTextAligned(totalPagesTemplate, Element.ALIGN_LEFT, new Phrase(String.valueOf(totalPages), footerFont), 0, 0, 0);
    }
}
