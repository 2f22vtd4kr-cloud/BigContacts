import { BoardPageFrame } from "@/components/board-page-frame";
import IntelligenceReactorPage from "@/pages/reactor";

export default function BoardReactorPage() {
  return (
    <BoardPageFrame
      className="atlas-board-reactor"
      breadcrumb="Reactor"
      split
      title="Every step, on the record"
      description="The Reactor is the Bureau’s logbook. Each search, page and registry check lands here the moment it is recorded, and nothing else does."
    >
      <IntelligenceReactorPage boardMode />
    </BoardPageFrame>
  );
}
