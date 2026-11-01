/** Returns an error message if the file is not a real PDF, otherwise null. */
export async function validatePdf(file: File): Promise<string | null> {
  const looksLikePdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) return "Only PDF files are supported.";
  const header = new TextDecoder().decode(
    await file.slice(0, 5).arrayBuffer(),
  );
  if (header !== "%PDF-") return "That file doesn't look like a valid PDF.";
  return null;
}

/** Splits files into valid PDFs and one combined error message (null when all are valid). */
export async function validatePdfs(
  files: File[],
): Promise<{ good: File[]; error: string | null }> {
  const good: File[] = [];
  const problems: string[] = [];
  for (const f of files) {
    const problem = await validatePdf(f);
    if (problem) problems.push(`${f.name}: ${problem}`);
    else good.push(f);
  }
  return { good, error: problems.length ? problems.join(" ") : null };
}
