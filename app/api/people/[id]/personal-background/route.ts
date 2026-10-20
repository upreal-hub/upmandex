import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";

import {
  deletePersonalProfileBackground,
  getPersonalProfileBackground,
  PersonalProfileBackgroundError,
  uploadPersonalProfileBackground,
} from "@/lib/personal-profile-background";

export const runtime = "nodejs";

function responseFor(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022" && typeof error.meta?.column === "string" && error.meta.column.includes("ownerUserId")) {
    return NextResponse.json({ success: false, error: "Personal backgrounds are not available until the Preview database migration is applied" }, { status: 503 });
  }
  if (error instanceof PersonalProfileBackgroundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json({ success: true, asset: await getPersonalProfileBackground((await params).id) });
  } catch (error) {
    return responseFor(error, "Unable to load your personal background");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const formData = await request.formData();
    if ([...formData.keys()].some((key) => key !== "image")) {
      throw new PersonalProfileBackgroundError(400, "Invalid background upload");
    }
    const image = formData.get("image");
    if (!(image instanceof File)) throw new PersonalProfileBackgroundError(400, "Choose an image");
    const result = await uploadPersonalProfileBackground((await params).id, image);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return responseFor(error, "Unable to save your personal background");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json({ success: true, ...(await deletePersonalProfileBackground((await params).id)) });
  } catch (error) {
    return responseFor(error, "Unable to remove your personal background");
  }
}
