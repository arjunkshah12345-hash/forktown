import { redirect } from "next/navigation";
import { ensureStarterTown, STARTER_TOWN_SLUG } from "@/lib/sim/store";

export const dynamic = "force-dynamic";

/** Sample route now opens the real starter town — same sim engine as production. */
export default async function SampleRedirectPage() {
  await ensureStarterTown();
  redirect(`/towns/${STARTER_TOWN_SLUG}`);
}
