"use server";

import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma";
import { shareCookieName, signShareToken, verifyPassword } from "../../../../lib/share";

export async function unlockShare(token: string, password: string) {
  const secret = process.env.SHARE_SECRET;
  if (!secret) {
    return { ok: false, error: "Server ist nicht konfiguriert (SHARE_SECRET fehlt)." };
  }

  const share = await prisma.boardShareLink.findUnique({ where: { token } });
  if (!share) return { ok: false, error: "Link ungültig." };

  const ok = verifyPassword(password, share.passwordHash);
  if (!ok) return { ok: false, error: "Falsches Passwort." };

  cookies().set(shareCookieName(token), signShareToken(token, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/share/boards/${token}`,
  });

  return { ok: true };
}
