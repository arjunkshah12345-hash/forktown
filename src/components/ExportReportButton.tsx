"use client";

import { withBase } from "@/lib/paths";

export function ExportReportButton({ runId }: { runId: string }) {
  return (
    <a href={withBase(`/api/runs/${runId}/export`)} className="btn-ghost text-sm" download>
      Export markdown
    </a>
  );
}
