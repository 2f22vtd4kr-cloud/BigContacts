import GraphViewer from "@/pages/graph";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardConnectionsPage() {
  return (
    <BoardPageFrame
      className="atlas-board-connections"
      title="The people between you"
      description="Your own contacts, and the routes Atlas has found through them. Every link names the record behind it."
    >
      <GraphViewer />
    </BoardPageFrame>
  );
}
