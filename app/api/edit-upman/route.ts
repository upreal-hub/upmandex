import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(req: Request) {
  try {
    const updatedUpman =
      await req.json();

    const filePath = path.join(
      process.cwd(),
      "data",
      "upmans.json"
    );

    const content = await readFile(
      filePath,
      "utf8"
    );

    const upmans = JSON.parse(
      content
    );

    const index =
      upmans.findIndex(
        (u: any) =>
          u.slug ===
          updatedUpman.slug
      );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Upman not found",
        },
        { status: 404 }
      );
    }

    upmans[index] = {
      ...upmans[index],
      name:
        updatedUpman.name,
      creator:
        updatedUpman.creator,
      rarity:
        updatedUpman.rarity,
    };

    await writeFile(
      filePath,
      JSON.stringify(
        upmans,
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
    });
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