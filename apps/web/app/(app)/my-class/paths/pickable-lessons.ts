import { classRepository, lessonsVisibleTo, prisma } from "@cyberlearn/db";
import type { PickableLesson } from "../_components/path-builder";

/**
 * Every lesson a teacher may put in a path, in one list.
 *
 * lessonsVisibleTo is the same rule the catalogue reads and the same one the
 * action re-checks on submit, so the picker cannot offer something the save
 * would then refuse. Their own classes' lessons are marked rather than
 * separated: a path may mix them freely, and a teacher looking for "chapitre 3"
 * does not care which shelf it came from.
 *
 * Titles and categories only. The builder names lessons, it does not render
 * them, and the MDX of sixty lessons has no business crossing to the browser.
 */
export async function pickableLessonsFor(userId: string): Promise<PickableLesson[]> {
  const taught = await classRepository.findForTeacher(userId);
  const taughtClassIds = taught.flatMap((e) =>
    e.promotions.flatMap((p) => p.classes.map((c) => c.id)),
  );

  const rows = await prisma.lesson.findMany({
    where: lessonsVisibleTo(userId),
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      audience: true,
      classLinks: { select: { classId: true } },
    },
  });

  const mine = new Set(taughtClassIds);
  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    search: `${l.title} ${l.category}`.toLowerCase(),
    own: l.audience === "CLASS" && l.classLinks.some((c) => mine.has(c.classId)),
  }));
}
