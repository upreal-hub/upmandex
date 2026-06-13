import { readdir } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
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
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to read folder",
      },
      { status: 500 }
    );
  }
}