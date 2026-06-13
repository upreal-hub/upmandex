import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(
  req: Request
) {
  try {
    const { searchParams } =
      new URL(req.url);

    const viewer =
      searchParams.get(
        "viewer"
      );

    if (!viewer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing viewer",
        },
        { status: 400 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "data",
      "inventories.json"
    );

    const content =
      await readFile(
        filePath,
        "utf8"
      );

    const inventories =
      JSON.parse(content);

    return NextResponse.json({
      success: true,
      inventory:
        inventories[viewer] ??
        {
          upmans: [],
        },
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