import { getAdminUpmanSubmissions } from "@/lib/upman-submissions";

import UpmanSubmissionManager from "./UpmanSubmissionManager";

export const dynamic = "force-dynamic";

export default async function AdminUpmanSubmissionsPage() {
  const submissions = await getAdminUpmanSubmissions();
  return <UpmanSubmissionManager submissions={submissions.map((submission) => ({ ...submission, createdAt: submission.createdAt.toISOString(), reviewedAt: submission.reviewedAt?.toISOString() ?? null }))} />;
}
