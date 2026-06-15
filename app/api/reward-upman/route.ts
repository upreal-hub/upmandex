import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function rewardUpman(
  secret: string,
  viewer: string,
  slug: string
) {
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

  const user =
    await prisma.user.findUnique({
      where: {
        twitchLogin: viewer,
      },
    });

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Viewer not found",
      },
      { status: 404 }
    );
  }

  const upman =
    await prisma.upman.findUnique({
      where: {
        slug,
      },
    });

  if (!upman) {
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
        viewer,
    },
  });

  return NextResponse.json({
    success: true,
    upman: upman.name,
    viewer,
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