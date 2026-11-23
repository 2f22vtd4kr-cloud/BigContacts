import IntelligenceReactorPage from "@/pages/reactor";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardReactorPage() {
  return (
    <BoardPageFrame
      className="atlas-board-reactor"
      title="Every step, on the record"
      description="The Reactor is the Bureau’s logbook. Each search, page and registry check lands here the moment it is recorded, and nothing else does."
    >
      <IntelligenceReactorPage />
    </BoardPageFrame>
  );
}
