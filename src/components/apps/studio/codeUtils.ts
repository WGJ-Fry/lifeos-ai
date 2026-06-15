export function formatHtmlLikeCode(source: string) {
  let formatted = "";
  let indent = 0;
  const lines = source
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    if (line.startsWith("</") || line.startsWith("</html>") || line.startsWith("</div>") || line.startsWith("</head>") || line.startsWith("</body>")) {
      indent = Math.max(0, indent - 1);
    }

    formatted += `${"  ".repeat(indent)}${line}\n`;

    if (
      line.startsWith("<") &&
      !line.startsWith("</") &&
      !line.endsWith("/>") &&
      !line.startsWith("<!") &&
      !line.includes("</") &&
      !line.match(/^(meta|link|br|input|img|hr)/i)
    ) {
      indent++;
    }
  }

  return formatted.trim();
}
