import DeepSearch from "@/pages/deep-search";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardDiscoverPage() {
  return (
    <BoardPageFrame
      className="atlas-board-discover"
      title="Where Atlas looks"
      description="Saved searches and the sources behind them. Atlas chooses its own sources for each run; this page shows what it can choose from."
    >
      <DeepSearch />
    </BoardPageFrame>
  );
}
