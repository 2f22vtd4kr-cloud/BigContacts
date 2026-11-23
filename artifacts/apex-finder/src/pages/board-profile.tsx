import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { useListEntities } from "@workspace/api-client-react";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";
import { BoardPageFrame } from "@/components/board-page-frame";

const RECENT_CARD_KEY = "apex-atlas-recent-card-tabs-v1";

export default function BoardProfilePage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const { data: rawEntities } = useListEntities({ limit: 200 });
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_CARD_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setRecentIds(parsed.filter((value): value is string => typeof value === "string").slice(0, 5));
    } catch {
      setRecentIds([]);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady || !id) return;
    setRecentIds((current) => {
      const next = [id, ...current.filter((value) => value !== id)].slice(0, 5);
      try { window.localStorage.setItem(RECENT_CARD_KEY, JSON.stringify(next)); } catch { /* Storage may be unavailable in private browsing. */ }
      return next;
    });
  }, [id, storageReady]);

  const tabs = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    const visible = raw.filter((entity: any) => !entity.isHidden);
    return recentIds
      .map((recentId) => visible.find((entity: any) => String(entity.id) === recentId))
      .filter(Boolean)
      .slice(0, 5);
  }, [rawEntities, recentIds]);

  return (
    <BoardPageFrame
      className="atlas-board-profile"
      title="One card, one subject"
      description="Atlas opens a card for each person or company it has enough evidence to follow. Every card is its own tab."
    >
      <nav className="atlas-profile-tabs" aria-label="Recently opened subject cards">
        {tabs.map((entity: any) => (
          <Link
            key={entity.id}
            href={"/profile/" + entity.id}
            aria-current={String(entity.id) === id ? "page" : undefined}
            className="atlas-profile-tab"
          >
            <strong>{entity.name}</strong>
            <span>{/company|corporation|trust|organization/i.test(String(entity.type ?? "")) ? "Company" : "Person"}</span>
          </Link>
        ))}
        <Link href="/profiles" className="atlas-profile-tab atlas-profile-tab-more">All cards <span>Open Ledger</span></Link>
      </nav>
      <ProfileErrorBoundary key={id}>
        <ApexProfile />
      </ProfileErrorBoundary>
    </BoardPageFrame>
  );
}
