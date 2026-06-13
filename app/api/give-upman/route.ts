import { readFile, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  return NextResponse.json({
    route: "give-upman OK",
  });
}

export async function POST(req: Request) {
  try {
    const {
      viewer,
      slug,
    } = await req.json();

    if (!viewer || !slug) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing viewer or slug",
        },
        { status: 400 }
      );
    }

    const inventoriesPath =
      path.join(
        process.cwd(),
        "data",
        "inventories.json"
      );

    const inventoriesContent =
      await readFile(
        inventoriesPath,
        "utf8"
      );

    const inventories =
      JSON.parse(
        inventoriesContent
      );

    if (!inventories[viewer]) {
      inventories[viewer] = {
        upmans: [],
      };
    }

    const alreadyOwned =
      inventories[
        viewer
      ].upmans.some(
        (
          item: {
            slug: string;
          }
        ) =>
          item.slug === slug
      );

    if (alreadyOwned) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Upman already owned",
        },
        { status: 400 }
      );
    }

    inventories[
      viewer
    ].upmans.push({
      slug,
      obtainedAt:
        new Date().toISOString(),
      source: "manual",
    });

    await writeFile(
      inventoriesPath,
      JSON.stringify(
        inventories,
        null,
        2
      )
    );

    const upmansPath =
      path.join(
        process.cwd(),
        "data",
        "upmans.json"
      );

    const upmansContent =
      await readFile(
        upmansPath,
        "utf8"
      );

    const upmans =
      JSON.parse(
        upmansContent
      );

    const upman =
      upmans.find(
        (u: any) =>
          u.slug === slug
      );

    if (upman) {

      upman.owners =
        (upman.owners ?? 0) + 1;

      if (
        !upman.firstOwner
      ) {
        upman.firstOwner =
          viewer;
      }

      await writeFile(
        upmansPath,
        JSON.stringify(
          upmans,
          null,
          2
        )
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