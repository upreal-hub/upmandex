import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth();

  return (
    <main className="p-10">
      <pre>
        {JSON.stringify(
          session,
          null,
          2
        )}
      </pre>
    </main>
  );
}