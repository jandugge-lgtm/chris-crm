import Link from "next/link";
import { prisma } from "../../lib/prisma";

export const dynamic = "force-dynamic";

export default async function CockpitPage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-black px-10 py-8 text-zinc-100">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500 bg-clip-text text-transparent">
              Cockpit
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/cockpit/person/${u.id}`}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-sky-500/50 hover:bg-zinc-900"
          >
            <div className="text-lg font-semibold text-zinc-100">{u.name}</div>
            <div className="mt-1 text-sm text-zinc-500">Person öffnen →</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
