"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import {
  archiveFirstCatalogue,
  type FirstCatalogueCounts,
} from "@/lib/services/first-catalogue.service";

/**
 * Archives the first catalogue's paths and lessons. Nothing comes from the
 * browser: the server finds them by their refCodes.
 */
export async function archiveFirstCatalogueAction(): Promise<FirstCatalogueCounts> {
  const admin = await requireAdminAction();
  const counts = await archiveFirstCatalogue(admin.id);
  for (const path of ["/paths", "/paths/archives", "/lessons", "/lessons/archives"]) {
    revalidatePath(path);
  }
  return counts;
}
