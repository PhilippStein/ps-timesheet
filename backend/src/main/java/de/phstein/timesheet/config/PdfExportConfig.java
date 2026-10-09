package de.phstein.timesheet.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PdfExportConfig {

    private String templatePdfPath;
    private Double marginTopMm = 20.0;
    private Double marginBottomMm = 20.0;
    private Double marginLeftMm = 15.0;
    private Double marginRightMm = 15.0;

    public PdfExportConfig() {
    }

    public PdfExportConfig(String templatePdfPath, Double marginTopMm, Double marginBottomMm, Double marginLeftMm, Double marginRightMm) {
        this.templatePdfPath = templatePdfPath;
        if (marginTopMm != null) this.marginTopMm = marginTopMm;
        if (marginBottomMm != null) this.marginBottomMm = marginBottomMm;
        if (marginLeftMm != null) this.marginLeftMm = marginLeftMm;
        if (marginRightMm != null) this.marginRightMm = marginRightMm;
    }

    public String getTemplatePdfPath() {
        return templatePdfPath;
    }

    public void setTemplatePdfPath(String templatePdfPath) {
        this.templatePdfPath = templatePdfPath;
    }

    public Double getMarginTopMm() {
        return marginTopMm != null ? marginTopMm : 20.0;
    }

    public void setMarginTopMm(Double marginTopMm) {
        this.marginTopMm = marginTopMm;
    }

    public Double getMarginBottomMm() {
        return marginBottomMm != null ? marginBottomMm : 20.0;
    }

    public void setMarginBottomMm(Double marginBottomMm) {
        this.marginBottomMm = marginBottomMm;
    }

    public Double getMarginLeftMm() {
        return marginLeftMm != null ? marginLeftMm : 15.0;
    }

    public void setMarginLeftMm(Double marginLeftMm) {
        this.marginLeftMm = marginLeftMm;
    }

    public Double getMarginRightMm() {
        return marginRightMm != null ? marginRightMm : 15.0;
    }

    public void setMarginRightMm(Double marginRightMm) {
        this.marginRightMm = marginRightMm;
    }
}
