const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = require("docx");

// Very small markdown -> DOCX converter (headings, bullet/numbered lists, bold, inline code).
// This intentionally stays dependency-light and mirrors the existing PDF export content.

const normalizeNewlines = (s) => String(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

const parseInlineRuns = (line) => {
  const text = String(line || "");
  const runs = [];

  let i = 0;
  const pushText = (t, opts = {}) => {
    if (!t) return;
    runs.push(new TextRun({ text: t, ...opts }));
  };

  while (i < text.length) {
    // Bold: **text**
    if (text[i] === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        pushText(inner, { bold: true });
        i = end + 2;
        continue;
      }
    }

    // Inline code: `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);
        pushText(inner, { font: "Courier New" });
        i = end + 1;
        continue;
      }
    }

    // Plain text chunk until next marker
    const nextBold = text.indexOf("**", i);
    const nextCode = text.indexOf("`", i);
    const next = [nextBold, nextCode].filter((x) => x !== -1);
    const cut = next.length ? Math.min(...next) : -1;
    if (cut === -1) {
      pushText(text.slice(i));
      break;
    }
    pushText(text.slice(i, cut));
    i = cut;
  }

  return runs.length ? runs : [new TextRun({ text: "" })];
};

const mdToParagraphs = (markdown) => {
  const lines = normalizeNewlines(markdown).split("\n");
  const paragraphs = [];

  const numberingRef = "numbered";

  for (const raw of lines) {
    const line = String(raw || "").trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      // Spacer line
      paragraphs.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const content = hMatch[2] || "";
      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : level === 3
              ? HeadingLevel.HEADING_3
              : HeadingLevel.HEADING_4;

      paragraphs.push(
        new Paragraph({
          heading,
          children: parseInlineRuns(content),
          spacing: { before: level === 1 ? 0 : 200, after: 120 },
        })
      );
      continue;
    }

    // Bullet list: - item, * item
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(bulletMatch[1] || ""),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Numbered list: 1. item
    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      paragraphs.push(
        new Paragraph({
          children: parseInlineRuns(numMatch[1] || ""),
          numbering: { reference: numberingRef, level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Paragraph
    paragraphs.push(
      new Paragraph({
        children: parseInlineRuns(trimmed),
        spacing: { after: 120 },
      })
    );
  }

  return { paragraphs, numberingRef };
};

async function generateDOCXFromMarkdown(markdownContent, title = "Report") {
  const { paragraphs, numberingRef } = mdToParagraphs(markdownContent);

  const doc = new Document({
    creator: "Z-Inspection",
    title,
    numbering: {
      config: [
        {
          reference: numberingRef,
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = {
  generateDOCXFromMarkdown,
};







