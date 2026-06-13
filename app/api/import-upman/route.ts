import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  return NextResponse.json({
    route: "import-upman OK",
  });
}

export async function POST(req: Request) {
  try {
    const newUpman = await req.json();

    console.log(
      "RECEIVED =",
      newUpman
    );

    const filePath = path.join(
      process.cwd(),
      "data",
      "upmans.json"
    );

    console.log(
      "FILE =",
      filePath
    );

    const content = await readFile(
      filePath,
      "utf8"
    );

    const upmans = JSON.parse(content);

    console.log(
      "COUNT =",
      upmans.length
    );

    const found = upmans.find(
      (u: any) =>
        u.slug.toLowerCase() ===
        newUpman.slug.toLowerCase()
    );

    console.log(
      "FOUND =",
      found
    );

    if (found) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Upman already exists",
        },
        { status: 400 }
      );
    }

    const upmanToSave = {
      ...newUpman,
      owners: 0,
      firstOwner: "",
    };

    upmans.push(upmanToSave);

    await writeFile(
      filePath,
      JSON.stringify(
        upmans,
        null,
        2
      )
    );

    console.log(
      "SAVED =",
      upmanToSave.slug
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