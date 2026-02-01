"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockShare } from "./actions";

export default function PasswordGate({
  token,
  boardLabel,
}: {
  token: string;
  boardLabel: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h1 className="text-2xl font-semibold text-zinc-100">Geschütztes Board</h1>
      <p className="mt-2 text-sm text-zinc-400">{boardLabel}</p>

      <div className="mt-5 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort eingeben…"
          className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
        />

        <button
          onClick={() =>
            startTransition(async () => {
              setError("");
              const res = await unlockShare(token, password);
              if (!res.ok) {
                setError(res.error ?? "Fehler beim Entsperren.");
                return;
              }
              router.refresh();
            })
          }
          className="w-full rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm text-sky-200 hover:border-sky-500/70"
        >
          {isPending ? "prüfe…" : "Öffnen"}
        </button>

        {error ? <div className="text-sm text-red-300">{error}</div> : null}
      </div>
    </div>
  );
}
