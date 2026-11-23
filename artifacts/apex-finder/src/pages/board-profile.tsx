import { useParams } from "wouter";
import ApexProfile from "@/pages/profile";
import { ProfileErrorBoundary } from "@/components/profile-error-boundary";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardProfilePage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id ?? "");
  return (
    <BoardPageFrame
      className="atlas-board-profile"
      title="One card, one subject"
      description="Atlas opens a card for each person or company it has enough evidence to follow. Every card is its own tab."
    >
      <ProfileErrorBoundary key={id}>
        <ApexProfile />
      </ProfileErrorBoundary>
    </BoardPageFrame>
  );
}
