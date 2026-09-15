import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { classRepository } from "@cyberlearn/db";
import { PageHeader, Tag, UI, EmptyState } from "../_components/admin-ui";
import { ComposeForms } from "./_components/ComposeForms";

export const metadata: Metadata = { title: "Classes" };
export const dynamic = "force-dynamic";

/**
 * The school tree, laid out the way it is nested: establishment, then intake,
 * then class. A flat list of classes would be readable at three and useless at
 * forty, and it is the nesting that tells you which "SIO1-A" you are looking at
 * when two schools both have one.
 */
export default async function AdminClassesPage(): Promise<React.ReactElement> {
  const [hierarchy, classes] = await Promise.all([
    classRepository.listHierarchy(),
    classRepository.listAll(),
  ]);

  const byPromotion = new Map<string, typeof classes>();
  for (const c of classes) {
    const list = byPromotion.get(c.promotion.id) ?? [];
    list.push(c);
    byPromotion.set(c.promotion.id, list);
  }

  const totalClasses = classes.length;
  const totalPromotions = hierarchy.reduce((n, e) => n + e.promotions.length, 0);

  return (
    <main>
      <PageHeader
        eyebrow="Structure"
        title="Classes"
        description={`${String(hierarchy.length)} établissement(s), ${String(totalPromotions)} promo(s), ${String(totalClasses)} classe(s). Une classe appartient à une promo, qui appartient à un établissement.`}
      />

      <ComposeForms
        establishments={hierarchy.map((e) => ({
          id: e.id,
          name: e.name,
          promotions: e.promotions.map((p) => ({ id: p.id, name: p.name })),
        }))}
      />

      {hierarchy.length === 0 ? (
        <EmptyState
          title="Aucun établissement"
          text="Crée un établissement, puis une promo, puis une classe."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 28 }}>
          {hierarchy.map((est) => (
            <section key={est.id}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: UI.fg,
                  margin: "0 0 4px",
                }}
              >
                {est.name}
                {est.city !== null && (
                  <span style={{ color: UI.faint, fontWeight: 400, fontSize: 13 }}>
                    {" "}
                    · {est.city}
                  </span>
                )}
              </h2>

              {est.promotions.length === 0 ? (
                <p className="mono" style={{ color: UI.faint, fontSize: 12, margin: "8px 0 0" }}>
                  Aucune promo dans cet établissement.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                  {est.promotions.map((promo) => {
                    const promoClasses = byPromotion.get(promo.id) ?? [];
                    return (
                      <div
                        key={promo.id}
                        style={{ border: `1px solid ${UI.border}`, padding: "14px 16px" }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: 11,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: UI.muted,
                            marginBottom: 10,
                          }}
                        >
                          {promo.name}
                          {promo.startYear !== null && (
                            <span style={{ color: UI.faint }}> · {promo.startYear}</span>
                          )}
                        </div>

                        {promoClasses.length === 0 ? (
                          <p className="mono" style={{ color: UI.faint, fontSize: 12, margin: 0 }}>
                            Aucune classe.
                          </p>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {promoClasses.map((c) => (
                              <Link
                                key={c.id}
                                href={`/classes/${c.id}`}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 5,
                                  minWidth: 210,
                                  padding: "12px 14px",
                                  border: `1px solid ${UI.border}`,
                                  textDecoration: "none",
                                  opacity: c.archivedAt === null ? 1 : 0.5,
                                }}
                              >
                                <span style={{ color: UI.fg, fontWeight: 600, fontSize: 13.5 }}>
                                  {c.name}
                                  {c.archivedAt !== null && <Tag tone="neutral"> archivée</Tag>}
                                </span>
                                <span className="mono" style={{ fontSize: 10.5, color: UI.muted }}>
                                  {c._count.members} élève(s) ·{" "}
                                  {c.teachers.length === 0
                                    ? "aucun prof"
                                    : c.teachers
                                        .map((t) => t.teacher.displayName)
                                        .slice(0, 3)
                                        .join(", ")}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
