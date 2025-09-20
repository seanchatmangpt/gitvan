// src/workflow/step-handlers/output-step-handler.mjs
// Document generation step handler with multi-format output support

import { BaseStepHandler } from "./base-step-handler.mjs";
import { useTemplate } from "../../composables/template.mjs";
import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";

/**
 * Handler for document generation steps with multi-format output
 * Supports LaTeX, Word, Excel, PowerPoint, HTML, and Markdown
 */
export class OutputStepHandler extends BaseStepHandler {
  getStepType() {
    return "output";
  }

  validate(step) {
    if (!step.config) {
      throw new Error("Output step missing configuration");
    }

    const { template, templatePath, outputPath, format } = step.config;

    if (!template && !templatePath) {
      throw new Error("Output step missing template or templatePath");
    }

    if (!outputPath) {
      throw new Error("Output step missing outputPath");
    }

    if (!format && !this._getFormatFromPath(outputPath)) {
      throw new Error(
        "Output step missing format and cannot determine from outputPath"
      );
    }

    return true;
  }

  /**
   * Execute document generation step
   * @param {object} step - Step definition
   * @param {object} inputs - Step inputs
   * @param {object} context - Execution context
   * @returns {Promise<object>} Step execution result
   */
  async execute(step, inputs, context) {
    try {
      this.validate(step);

      const {
        template,
        templatePath,
        outputPath,
        format = "auto",
        dataPath,
        csvPath,
        baseIRI = "http://example.org/",
        entityType = "Record",
        query,
        queryName = "results",
        ...templateOptions
      } = step.config;

      this.logger.info(`📄 Generating ${format} document: ${outputPath}`);

      // Initialize template engine
      const templateEngine = await useTemplate({
        paths: templateOptions.paths || ["./templates"],
        autoescape: templateOptions.autoescape !== false,
        noCache: templateOptions.noCache || false,
      });

      // Render template content
      let templateContent;
      if (template) {
        templateContent = template;
      } else if (templatePath) {
        templateContent = await readFile(templatePath, "utf8");
      }

      // Process template with inputs
      const renderedContent = await templateEngine.renderString(
        templateContent,
        inputs
      );

      // Determine output format
      const outputFormat =
        format === "auto" ? this._getFormatFromPath(outputPath) : format;

      // Generate document based on format
      const result = await this._generateDocument(
        outputFormat,
        renderedContent,
        outputPath,
        inputs,
        { dataPath, csvPath, baseIRI, entityType, query, queryName }
      );

      return this.createResult({
        outputPath: result.path,
        format: outputFormat,
        contentLength: result.size,
        pages: result.pages,
        templateUsed: template ? "inline" : templatePath,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`❌ Output step failed: ${error.message}`);
      return this.createResult(null, false, error.message);
    }
  }

  /**
   * Generate document in specified format
   * @param {string} format - Output format
   * @param {string} content - Rendered content
   * @param {string} outputPath - Output file path
   * @param {object} inputs - Input data
   * @param {object} options - Additional options
   * @returns {Promise<object>} Generation result
   */
  async _generateDocument(format, content, outputPath, inputs, options) {
    const fullPath = resolve(outputPath);

    // Ensure output directory exists
    const dir = dirname(fullPath);
    if (dir !== "." && dir !== fullPath) {
      try {
        await import("node:fs").then((fs) =>
          fs.promises.mkdir(dir, { recursive: true })
        );
      } catch (error) {
        if (error.code !== "EEXIST") {
          throw error;
        }
      }
    }

    switch (format.toLowerCase()) {
      case "latex":
      case "tex":
        return await this._generateLaTeX(content, fullPath);

      case "docx":
      case "word":
        return await this._generateWord(content, fullPath);

      case "xlsx":
      case "excel":
        return await this._generateExcel(inputs, options, fullPath);

      case "pptx":
      case "powerpoint":
        return await this._generatePowerPoint(inputs, options, fullPath);

      case "html":
        return await this._generateHTML(content, fullPath);

      case "md":
      case "markdown":
      default:
        return await this._generateMarkdown(content, fullPath);
    }
  }

  /**
   * Generate LaTeX document
   */
  async _generateLaTeX(content, outputPath) {
    const latex = this._markdownToLaTeX(content);
    await writeFile(outputPath, latex, "utf8");
    return {
      path: outputPath,
      size: latex.length,
      pages: this._estimatePages(latex),
    };
  }

  /**
   * Generate Word document (HTML format)
   */
  async _generateWord(content, outputPath) {
    const html = await this._markdownToDocx(content);
    const docPath = outputPath.replace(/\.docx?$/, ".doc");
    await writeFile(docPath, html, "utf8");
    return {
      path: docPath,
      size: html.length,
      pages: this._estimatePages(html),
    };
  }

  /**
   * Generate Excel spreadsheet
   */
  async _generateExcel(inputs, options, outputPath) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "GitVan Output Handler";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create worksheet from inputs
    const worksheet = workbook.addWorksheet("Data");

    // Convert inputs to rows
    const rows = this._convertInputsToRows(inputs);
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]);

      worksheet.columns = columns.map((col) => ({
        header: col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, " "),
        key: col,
        width: 20,
      }));

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0051CC" },
      };

      // Add data
      rows.forEach((row) => worksheet.addRow(row));
    }

    await workbook.xlsx.writeFile(outputPath);
    return {
      path: outputPath,
      size: (await import("node:fs")).promises
        .stat(outputPath)
        .then((s) => s.size),
      pages: 1,
    };
  }

  /**
   * Generate PowerPoint presentation (HTML format)
   */
  async _generatePowerPoint(inputs, options, outputPath) {
    const html = this._createPowerPointHTML(inputs, options);
    const htmlPath = outputPath.replace(/\.pptx?$/, "-presentation.html");
    await writeFile(htmlPath, html, "utf8");
    return {
      path: htmlPath,
      size: html.length,
      pages: this._countSlides(html),
    };
  }

  /**
   * Generate HTML document
   */
  async _generateHTML(content, outputPath) {
    const { marked } = await import("marked");
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Generated Document</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
${marked(content)}
</body>
</html>`;

    await writeFile(outputPath, html, "utf8");
    return {
      path: outputPath,
      size: html.length,
      pages: this._estimatePages(html),
    };
  }

  /**
   * Generate Markdown document
   */
  async _generateMarkdown(content, outputPath) {
    await writeFile(outputPath, content, "utf8");
    return {
      path: outputPath,
      size: content.length,
      pages: this._estimatePages(content),
    };
  }

  /**
   * Convert Markdown to LaTeX
   */
  _markdownToLaTeX(markdown) {
    // Remove frontmatter
    let content = markdown;
    if (content.startsWith("---")) {
      const endIndex = content.indexOf("---", 3);
      if (endIndex !== -1) {
        content = content.substring(endIndex + 3).trim();
      }
    }

    let latex = `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage[margin=1in]{geometry}

% Define colors
\\definecolor{sectioncolor}{RGB}{0,51,102}
\\definecolor{tableheader}{RGB}{240,240,240}

% Headers and footers
\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{Page \\thepage}
\\lfoot{Generated with GitVan}

\\begin{document}

`;

    // Convert markdown elements to LaTeX
    content = content
      // Headers
      .replace(/^# (.*?)$/gm, "\\section{$1}")
      .replace(/^## (.*?)$/gm, "\\subsection{$1}")
      .replace(/^### (.*?)$/gm, "\\subsubsection{$1}")
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, "\\textbf{\\textit{$1}}")
      .replace(/\*\*(.*?)\*\*/g, "\\textbf{$1}")
      .replace(/\*(.*?)\*/g, "\\textit{$1}")
      // Lists
      .replace(/^- (.*?)$/gm, "\\item $1")
      .replace(/^(\d+)\. (.*?)$/gm, "\\item $2")
      // Code blocks
      .replace(/```(.*?)```/gs, "\\begin{verbatim}$1\\end{verbatim}")
      // Inline code
      .replace(/`(.*?)`/g, "\\texttt{$1}")
      // Special characters
      .replace(/\$/g, "\\$")
      .replace(/%/g, "\\%")
      .replace(/&/g, "\\&")
      .replace(/#/g, "\\#")
      .replace(/_/g, "\\_");

    // Handle lists properly
    content = content.replace(/(\\item.*\n)+/g, (match) => {
      return "\\begin{itemize}\n" + match + "\\end{itemize}\n";
    });

    latex += content;
    latex += "\n\\end{document}";

    return latex;
  }

  /**
   * Convert Markdown to Word-compatible HTML
   */
  async _markdownToDocx(markdown) {
    const { marked } = await import("marked");
    const html = marked(markdown);

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>Document</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: 8.5in 11.0in; margin: 1in; }
    body { font-family: Calibri, sans-serif; font-size: 11pt; line-height: 1.6; }
    h1 { font-size: 20pt; font-weight: bold; color: #003366; page-break-after: avoid; }
    h2 { font-size: 16pt; font-weight: bold; color: #0066cc; page-break-after: avoid; }
    h3 { font-size: 14pt; font-weight: bold; color: #333333; page-break-after: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 10pt 0; }
    th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; }
    th { background-color: #0066cc; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    ul, ol { margin-left: 20pt; }
    li { margin: 5pt 0; }
    code { background: #f4f4f4; padding: 2pt 4pt; font-family: 'Courier New', monospace; }
    pre { background: #f4f4f4; padding: 10pt; overflow-x: auto; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  ${html}
  <div style="margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #ccc; color: #666; font-size: 9pt;">
    Generated by GitVan on ${new Date().toLocaleString()}
  </div>
</body>
</html>`;
  }

  /**
   * Create PowerPoint-compatible HTML presentation
   */
  _createPowerPointHTML(inputs, options) {
    const title = inputs.title || "Generated Presentation";
    const date = new Date().toLocaleDateString();

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .slide {
      width: 1024px;
      height: 768px;
      margin: 20px auto;
      padding: 60px;
      background: white;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      page-break-after: always;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .title-slide {
      background: linear-gradient(135deg, #003366 0%, #0066cc 100%);
      color: white;
      text-align: center;
      justify-content: center;
      align-items: center;
    }
    .title-slide h1 {
      font-size: 56pt;
      font-weight: bold;
      margin-bottom: 30px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .title-slide .subtitle {
      font-size: 24pt;
      opacity: 0.9;
    }
    .title-slide .date {
      font-size: 18pt;
      margin-top: 50px;
      opacity: 0.8;
    }
    .content-slide h2 {
      font-size: 36pt;
      color: #003366;
      border-bottom: 4px solid #0066cc;
      padding-bottom: 15px;
      margin-bottom: 40px;
    }
    .data-table {
      border-collapse: collapse;
      width: 100%;
      margin: 30px 0;
      font-size: 14pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    .data-table th {
      background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12pt;
    }
    .data-table tr:nth-child(even) { background: #f8f9fa; }
    .slide-number {
      position: absolute;
      bottom: 20px;
      right: 30px;
      color: #666;
      font-size: 12pt;
    }
    @media print {
      body { background: white; }
      .slide { box-shadow: none; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${title}</h1>
    <div class="subtitle">Generated with GitVan</div>
    <div class="date">${date}</div>
  </div>
  
  <div class="slide content-slide">
    <h2>Data Summary</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Key</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(inputs)
          .slice(0, 10)
          .map(
            ([key, value]) => `
        <tr>
          <td>${key}</td>
          <td>${typeof value === "object" ? JSON.stringify(value) : value}</td>
        </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    <div class="slide-number">2</div>
  </div>
</body>
</html>`;
  }

  /**
   * Convert inputs to Excel rows
   */
  _convertInputsToRows(inputs) {
    const rows = [];

    // If inputs is an array, use it directly
    if (Array.isArray(inputs)) {
      return inputs;
    }

    // If inputs is an object, convert to rows
    if (typeof inputs === "object") {
      // Try to find array properties
      for (const [key, value] of Object.entries(inputs)) {
        if (Array.isArray(value) && value.length > 0) {
          return value;
        }
      }

      // Convert object to single row
      return [inputs];
    }

    return rows;
  }

  /**
   * Get format from file path
   */
  _getFormatFromPath(path) {
    const ext = extname(path).toLowerCase();
    switch (ext) {
      case ".tex":
      case ".latex":
        return "latex";
      case ".docx":
      case ".doc":
        return "docx";
      case ".xlsx":
      case ".xls":
        return "xlsx";
      case ".pptx":
      case ".ppt":
        return "pptx";
      case ".html":
      case ".htm":
        return "html";
      case ".md":
      case ".markdown":
        return "markdown";
      default:
        return "markdown";
    }
  }

  /**
   * Estimate number of pages
   */
  _estimatePages(content) {
    // Rough estimate: 3000 characters per page
    return Math.max(1, Math.ceil(content.length / 3000));
  }

  /**
   * Count slides in HTML presentation
   */
  _countSlides(html) {
    const slideMatches = html.match(/class="slide"/g);
    return slideMatches ? slideMatches.length : 1;
  }
}
