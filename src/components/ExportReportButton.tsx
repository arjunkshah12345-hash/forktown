"use client";

export function ExportReportButton({ runId }: { runId: string }) {
  return (
    <a href={`/api/runs/${runId}/export`} className="btn-ghost text-sm" download>
      Export markdown
    </a>
  );
}
