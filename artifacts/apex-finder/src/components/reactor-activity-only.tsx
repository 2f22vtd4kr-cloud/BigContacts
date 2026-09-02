import React from "react";

type ActivityNode = {
  id: string;
  label: string;
  sub: string;
  type: string;
  color: string;
  Icon: React.ElementType;
};

export function ReactorActivityOnly({ nodes }: { nodes: ActivityNode[] }) {
  const cols = Math.min(4, Math.max(1, nodes.length));
  const gap = 18;
  const cardH = 66;
  const rows = nodes.length ? Math.ceil(nodes.length / cols) : 1;
  const canvasH = Math.max(150, rows * cardH + Math.max(0, rows - 1) * gap + 48);

  return (
    <div
      data-testid="scheme-activity-only"
      aria-label="Live activity scheme"
      style={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 28px 26px",
        boxSizing: "border-box",
      }}
    >
      {nodes.length === 0 ? (
        <div
          data-testid="scheme-activity-empty"
          style={{
            width: "100%",
            maxWidth: 720,
            minHeight: 140,
            border: "1px dashed rgba(156,255,26,0.16)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#40556f",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            background: "rgba(12,18,30,0.32)",
          }}
        >
          NO LIVE TOOL ACTIVITY
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            maxWidth: 1040,
            minHeight: canvasH,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridAutoRows: `${cardH}px`,
            gap,
            alignContent: "center",
          }}
        >
          {nodes.map((node) => {
            const Icon = node.Icon;
            return (
              <div
                key={"activity-" + node.id}
                data-testid={"scheme-activity-node-" + node.id}
                aria-label={node.label + ", active"}
                style={{
                  minWidth: 0,
                  height: cardH,
                  borderRadius: node.type === "reactor" ? 10 : 7,
                  border: "1px solid " + node.color + "66",
                  background: node.color + "0d",
                  boxShadow: "0 0 18px " + node.color + "18, inset 0 0 14px " + node.color + "0a",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "0 12px",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: 5,
                    border: "1px solid " + node.color + "55",
                    background: node.color + "12",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: node.color,
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      color: node.color,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {node.label}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 9,
                      color: node.color + "aa",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {node.sub}
                  </div>
                </div>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    flexShrink: 0,
                    borderRadius: 999,
                    background: node.color,
                    boxShadow: "0 0 9px " + node.color,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
