import { readdir } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";
import { requireAdmin } from "@/lib/authorization";

export async function GET() {
  const authorization = await requireAdmin();
  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const folder = path.join(
      process.cwd(),
      "public",
      "upmans"
    );

    const files = await readdir(folder);

    const pngs = files
      .filter((file) =>
        file.endsWith(".png")
      )
      .map((file) =>
        file.replace(".png", "")
      );

    return NextResponse.json(pngs);
  } catch {
    return NextResponse.json(
      {
        error: "Unable to read folder",
      },
      { status: 500 }
    );
  }
}
