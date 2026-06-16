import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function rewardUpman(
  secret: string,
  viewer: string,
  slug: string
) {
  const normalizedViewer =
    viewer.trim().toLowerCase();

  console.log(
    "[REWARD] viewer reçu =",
    viewer
  );

  console.log(
    "[REWARD] viewer normalisé =",
    normalizedViewer
  );

  console.log(
    "[REWARD] slug =",
    slug
  );

  console.log(
    "SECRET =",
    process.env.STREAMERBOT_SECRET
  );

  if (
    secret !==
    process.env.STREAMERBOT_SECRET
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  let user =
  await prisma.user.findUnique({
    where: {
      twitchLogin:
        normalizedViewer,
    },
  });

if (!user) {
  console.log(
    "[REWARD] Auto-creating user:",
    normalizedViewer
  );

  user =
    await prisma.user.create({
      data: {
        twitchLogin:
          normalizedViewer,

        displayName:
          viewer,

        avatar: null,
      },
    });

  console.log(
    "[REWARD] User created:",
    normalizedViewer
  );
}

  const upman =
    await prisma.upman.findUnique({
      where: {
        slug,
      },
    });

  if (!upman) {
    console.error(
      "[REWARD] Upman not found:",
      slug
    );

    return NextResponse.json(
      {
        success: false,
        error: "Upman not found",
      },
      { status: 404 }
    );
  }

  const alreadyOwned =
    await prisma.inventory.findFirst({
      where: {
        userId: user.id,
        upmanId: upman.id,
      },
    });

  if (alreadyOwned) {
    console.log(
      "[REWARD] Already owned:",
      normalizedViewer,
      upman.name
    );

    return NextResponse.json({
      success: true,
      alreadyOwned: true,
    });
  }

  await prisma.inventory.create({
    data: {
      userId: user.id,
      upmanId: upman.id,
    },
  });

  await prisma.upman.update({
    where: {
      id: upman.id,
    },

    data: {
      ownersCount:
        upman.ownersCount + 1,

      firstOwner:
        upman.firstOwner ??
        normalizedViewer,
    },
  });

  console.log(
    "[REWARD] SUCCESS:",
    normalizedViewer,
    upman.name
  );

  return NextResponse.json({
    success: true,
    upman: upman.name,
    viewer: normalizedViewer,
  });
}

export async function GET(
  req: Request
) {
  try {
    const { searchParams } =
      new URL(req.url);

    const secret =
      searchParams.get(
        "secret"
      ) ?? "";

    const viewer =
      searchParams.get(
        "viewer"
      ) ?? "";

    const slug =
      searchParams.get(
        "slug"
      ) ?? "";

    return rewardUpman(
      secret,
      viewer,
      slug
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request
) {
  try {
    const {
      secret,
      viewer,
      slug,
    } = await req.json();

    return rewardUpman(
      secret,
      viewer,
      slug
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}