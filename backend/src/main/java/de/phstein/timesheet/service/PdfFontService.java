package de.phstein.timesheet.service;

import com.lowagie.text.Font;
import com.lowagie.text.pdf.BaseFont;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.annotation.PostConstruct;

import java.io.InputStream;

@ApplicationScoped
public class PdfFontService {

    private BaseFont baseFontRegular;
    private BaseFont baseFontBold;

    @PostConstruct
    public void init() {
        try {
            byte[] regularBytes = loadResource("/fonts/PTSans-Regular.ttf");
            byte[] boldBytes = loadResource("/fonts/PTSans-Bold.ttf");

            if (regularBytes != null) {
                this.baseFontRegular = BaseFont.createFont("PTSans-Regular.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, regularBytes, null);
            } else {
                this.baseFontRegular = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            }

            if (boldBytes != null) {
                this.baseFontBold = BaseFont.createFont("PTSans-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, boldBytes, null);
            } else {
                this.baseFontBold = BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize PDF fonts", e);
        }
    }

    private byte[] loadResource(String path) {
        try (InputStream is = getClass().getResourceAsStream(path)) {
            if (is == null) {
                return null;
            }
            return is.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }

    public BaseFont getBaseFontRegular() {
        return baseFontRegular;
    }

    public BaseFont getBaseFontBold() {
        return baseFontBold;
    }

    public Font getRegularFont(float size) {
        return new Font(baseFontRegular, size, Font.NORMAL);
    }

    public Font getRegularFont() {
        return getRegularFont(11f);
    }

    public Font getBoldFont(float size) {
        return new Font(baseFontBold, size, Font.BOLD);
    }

    public Font getBoldFont() {
        return getBoldFont(11f);
    }
}
