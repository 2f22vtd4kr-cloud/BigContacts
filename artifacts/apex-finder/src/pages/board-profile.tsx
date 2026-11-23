import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { useListEntities } from "@workspace/api-client-react";
import { BoardPageFrame } from "@/components/board-page-frame";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";
import { normalizeEntityType } from "@/lib/entity-taxonomy";

const RECENT_CARD_KEY = "apex-atlas-recent-cards-v1";

export default function BoardProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const activeId = Number(params?.id ?? 0);
  const { data: rawEntities } = useListEntities({ limit: 500 });
  const [recentIds, setRecentIds] = useState<number[]>([]);

  const allEntities = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    const all = raw
      .filter((entity: any) => !entity.isHidden)
      .sort((a: any, b: any) => Number(b.bayesianScore ?? 0) - Number(a.bayesianScore ?? 0));
    return all;
  }, [rawEntities]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(RECENT_CARD_KEY) || "[]");
      if (Array.isArray(stored)) {
        setRecentIds([...new Set(stored.filter((id): id is number => Number.isInteger(id) && id > 0))].slice(0, 20));
      }
    } catch {
      setRecentIds([]);
    }
  }, []);

  useEffect(() => {
    if (!activeId || !allEntities.some((entity: any) => Number(entity.id) === activeId)) return;
    setRecentIds((current) => {
      if (current[0] === activeId) return current;
      const next = [activeId, ...current.filter((id) => id !== activeId)].slice(0, 20);
      try { window.localStorage.setItem(RECENT_CARD_KEY, JSON.stringify(next)); } catch { /* Recent tabs remain session-local if storage is unavailable. */ }
      return next;
    });
  }, [activeId, allEntities]);

  const tabs = useMemo(() => {
    const recent = recentIds
      .map((id) => allEntities.find((entity: any) => Number(entity.id) === id))
      .filter(Boolean);
    const current = allEntities.find((entity: any) => Number(entity.id) === activeId);
    if (current && !recent.some((entity: any) => Number(entity.id) === activeId)) recent.unshift(current);
    const recentIdsSet = new Set(recent.map((entity: any) => Number(entity.id)));
    const remaining = allEntities.filter((entity: any) => !recentIdsSet.has(Number(entity.id)));
    const items = [...recent, ...remaining].slice(0, 5);
    return { items, more: Math.max(0, allEntities.length - items.length) };
  }, [allEntities, recentIds, activeId]);

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
          const normalizedType = normalizeEntityType(entity.type);
          const kind = normalizedType === "Corporation" || normalizedType === "Trust" ? "Company" : normalizedType === "Other" ? "Record" : "Person";
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
