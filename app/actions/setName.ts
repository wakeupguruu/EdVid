// app/actions/setName.ts
"use server";

import setName from "@/utils/setName";

export async function setUserName(userId: string, name: string) {
  await setName(userId, name);
}