import { readFile, writeFile, unlink } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function POST(req: Request) {
  try {
    const { slug } = await req.json();

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing slug",
        },
        { status: 400 }
      );
    }

    const jsonPath = path.join(
      process.cwd(),
      "data",
      "upmans.json"
    );

    const content = await readFile(
      jsonPath,
      "utf8"
    );

    const upmans = JSON.parse(content);

    const filtered = upmans.filter(
      (u: any) =>
        u.slug !== slug
    );

    await writeFile(
      jsonPath,
      JSON.stringify(
        filtered,
        null,
        2
      )
    );

    const imagePath = path.join(
      process.cwd(),
      "public",
      "upmans",
      `${slug}.png`
    );

    try {
      await unlink(imagePath);
    } catch {
      console.log(
        "PNG already missing"
      );
    }

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