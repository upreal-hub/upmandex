import { notFound, permanentRedirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { normalizeTwitchLogin } from "@/lib/validation";

type Props = {
  params: Promise<{ collector: string }>;
};

export default async function CollectorCompatibilityPage({ params }: Props) {
  const { collector } = await params;
  const requestedCollector = decodeURIComponent(collector);
  const twitchLogin = normalizeTwitchLogin(requestedCollector);

  const user = twitchLogin
    ? await prisma.user.findUnique({
        where: { twitchLogin },
        select: { twitchLogin: true },
      })
    : null;

  const legacyUser =
    user ??
    (await prisma.user.findFirst({
      where: {
        displayName: {
          equals: requestedCollector,
          mode: "insensitive",
        },
      },
      select: { twitchLogin: true },
    }));

  if (!legacyUser) {
    notFound();
  }

  permanentRedirect(`/collection/${encodeURIComponent(legacyUser.twitchLogin)}`);
}
