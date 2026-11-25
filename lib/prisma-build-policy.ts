// Generation reads the schema and writes local source files; it never opens a database.
export function checkPrismaEnvironment(env: Readonly<Record<string, string | undefined>>, command: string | undefined) {
  if (command === "generate") return;
  if (env.VERCEL === "1" && (env.VERCEL_ENV !== "preview" || env.UPMANDEX_ENV !== "anniversary")) {
    throw new Error("Database commands are restricted to the UPMANDEX anniversary Vercel Preview environment.");
  }
}
