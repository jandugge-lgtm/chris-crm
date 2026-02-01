"use client";

import { useRef, useTransition } from "react";
import { updateKiKatalogMeta } from "./actions";

type Props = {
  taskId: string;
  initialGenre: string;
  initialSongs: string;
};

export default function KiKatalogFields({ taskId, initialGenre, initialSongs }: Props) {
  const [isPending, startTransition] = useTransition();
  const genreRef = useRef<HTMLInputElement>(null);
  const songsRef = useRef<HTMLInputElement>(null);

  function save() {
    const genre = genreRef.current?.value ?? "";
    const songs = songsRef.current?.value ?? "";
    startTransition(async () => {
      await updateKiKatalogMeta(taskId, genre, songs);
    });
  }

  return (
    <div className="mt-3 space-y-3 text-sm">
      <div>
        <label className="block text-zinc-400">Aktuelles Genre</label>
        <input
          ref={genreRef}
          defaultValue={initialGenre}
          onBlur={save}
          placeholder="z.B. Corporate"
          className="mt-1 w-full rounded-md bg-zinc-800 px-2 py-1 text-white outline-none focus:ring-1 focus:ring-cyan-400"
        />
      </div>

      <div>
        <label className="block text-zinc-400">Aktuelle Songanzahl</label>
        <input
          ref={songsRef}
          type="number"
          min={0}
          defaultValue={initialSongs}
          onBlur={save}
          placeholder="z.B. 42"
          className="mt-1 w-full rounded-md bg-zinc-800 px-2 py-1 text-white outline-none focus:ring-1 focus:ring-cyan-400"
        />
      </div>

      {isPending ? <div className="text-xs text-zinc-400">Speichert…</div> : null}
    </div>
  );
}
