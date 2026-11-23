import EntityLedger from "@/pages/entities";
import { BoardPageFrame } from "@/components/board-page-frame";

export default function BoardLedgerPage() {
  return (
    <BoardPageFrame
      className="atlas-board-ledger"
      title="Everyone on the register"
      description="The Ledger is the Bureau’s register. Each person Atlas has found is entered once, with the evidence that stands behind them."
    >
      <EntityLedger />
    </BoardPageFrame>
  );
}
