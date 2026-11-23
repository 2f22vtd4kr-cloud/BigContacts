import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useListEntities } from "@workspace/api-client-react";
import { BoardPageFrame } from "@/components/board-page-frame";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";

export default function BoardProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const activeId = Number(params?.id ?? 0);
  const { data: rawEntities } = useListEntities({ limit: 500 });

  const tabs = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    const all = raw
      .filter((entity: any) => !entity.isHidden)
      .sort((a: any, b: any) => Number(b.bayesianScore ?? 0) - Number(a.bayesianScore ?? 0));
    const first = all.slice(0, 5);
    if (activeId && !first.some((entity: any) => Number(entity.id) === activeId)) {
      const current = all.find((entity: any) => Number(entity.id) === activeId);
      if (current) first.splice(Math.max(0, first.length - 1), 1, current);
    }
    return { items: first, more: Math.max(0, all.length - first.length) };
  }, [rawEntities, activeId]);

  return (
    <BoardPageFrame
      className="atlas-board-profile"
      breadcrumb="Ledger / Cards"
      title="One card, one subject"
      description="Every person or company Atlas has enough evidence to follow gets its own card. Every card is its own tab."
    >
      <nav className="atlas-profile-tabs" aria-label="Subject cards">
        {tabs.items.map((entity: any) => {
          const active = Number(entity.id) === activeId;
          const kind = String(entity.type ?? "Person").toLowerCase() === "company" ? "Company" : "Person";
          return (
            <Link
              key={entity.id}
              href={"/profile/" + entity.id}
              className={"atlas-profile-tab" + (active ? " is-active" : "")}
              aria-current={active ? "page" : undefined}
            >
              <strong>{entity.name || "Unnamed record"}</strong>
              <span>{kind}</span>
            </Link>
          );
        })}
        {tabs.more > 0 && <Link href="/profiles" className="atlas-profile-tab-more">+ {tabs.more} more</Link>}
      </nav>
      <ProfileErrorBoundary>
        <ApexProfile boardMode />
      </ProfileErrorBoundary>
    </BoardPageFrame>
  );
}
