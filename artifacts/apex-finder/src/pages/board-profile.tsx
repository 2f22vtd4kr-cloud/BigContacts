import { useMemo } from "react";
import { useParams, Link } from "wouter";
import { useListEntities } from "@workspace/api-client-react";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardProfilePage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  const { data: rawEntities } = useListEntities({ limit: 200 });
  const tabs = useMemo(() => {
    const raw = Array.isArray(rawEntities)
      ? rawEntities
      : Array.isArray((rawEntities as any)?.entities)
        ? (rawEntities as any).entities
        : [];
    return raw.filter((entity: any) => !entity.isHidden).slice(0, 5);
  }, [rawEntities]);

  return (
    <BoardPageFrame
      className="atlas-board-profile"
      title="One card, one subject"
      description="Atlas opens a card for each person or company it has enough evidence to follow. Every card is its own tab."
    >
      <nav className="atlas-profile-tabs" aria-label="Open subject cards">
        {tabs.map((entity: any) => (
          <Link
            key={entity.id}
            href={"/profile/" + entity.id}
            aria-current={String(entity.id) === id ? "page" : undefined}
            className="atlas-profile-tab"
          >
            <strong>{entity.name}</strong>
            <span>{entity.type === "Corporation" || entity.type === "Trust" ? "Company" : "Person"}</span>
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
