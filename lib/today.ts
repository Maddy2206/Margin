/** "Sunday, 1 November": today's date for the handwritten date line. Call on the client only. */
export function formatToday(d = new Date()): string {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return `${weekday}, ${d.getDate()} ${month}`;
}
