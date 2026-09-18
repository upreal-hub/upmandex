import { del, put } from "@vercel/blob";
import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";

import { getUpmanBlobPath, isPngFile, UPMAN_IMAGE_MAX_BYTES } from "@/lib/blob";
import { requireAdmin } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { validateUploadedUpmanPayload } from "@/lib/validation";

export const runtime = "nodejs";

async function rollbackBlob(url: string) {
  try {
    await del(url);
  } catch {
    console.error("Unable to clean up the uploaded Upman image.");
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid upload form" },
      { status: 400 }
    );
  }

  const image = formData.get("image");
  const validation = validateUploadedUpmanPayload({
    name: formData.get("name"),
    slug: formData.get("slug"),
    rarity: formData.get("rarity"),
    creator: formData.get("creator"),
    creatorTwitch: formData.get("creatorTwitch"),
  });

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  if (!(image instanceof File)) {
    return NextResponse.json(
      { success: false, error: "A PNG image is required" },
      { status: 400 }
    );
  }

  if (
    image.size === 0 ||
    image.size > UPMAN_IMAGE_MAX_BYTES ||
    image.type !== "image/png" ||
    !image.name.toLowerCase().endsWith(".png") ||
    !(await isPngFile(image))
  ) {
    return NextResponse.json(
      { success: false, error: "Image must be a PNG smaller than 4 MiB" },
      { status: 400 }
    );
  }

  const data = validation.data;
  const existingUpman = await prisma.upman.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });

  if (existingUpman) {
    return NextResponse.json(
      { success: false, error: "An Upman with this slug already exists" },
      { status: 409 }
    );
  }

  let blob;

  try {
    blob = await put(getUpmanBlobPath(data.slug), image, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/png",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to upload the Upman image" },
      { status: 500 }
    );
  }

  try {
    const upman = await prisma.upman.create({
      data: {
        slug: data.slug,
        name: data.name,
        image: blob.url,
        rarity: data.rarity,
        creator: data.creator,
        creatorTwitch: data.creatorTwitch,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        rarity: true,
        creator: true,
        creatorTwitch: true,
        ownersCount: true,
        firstOwner: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, upman }, { status: 201 });
  } catch (error) {
    await rollbackBlob(blob.url);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "An Upman with this slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unable to create the Upman" },
      { status: 500 }
    );
  }
}
