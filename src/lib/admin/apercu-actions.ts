"use server";

import { draftMode } from "next/headers";

export async function quitterApercu(): Promise<void> {
  (await draftMode()).disable();
}
