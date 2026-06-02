import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import type { TreeNode } from "../../types/xiangqi";
import { getNodeAtPath } from "../../state/treeStore";

interface EvalChartProps {
  root: TreeNode;
  position: number[];
  onNavigate: (path: number[]) => void;
}

interface DataPoint {
  name: string;
  score: number | null;
  path: number[];
}

function buildMainlineData(root: TreeNode): DataPoint[] {
  const result: DataPoint[] = [];
  let node = root;
  const path: number[] = [];

  while (node.children[0]) {
    path.push(0);
    node = node.children[0];
    result.push({
      name: node.san || "?",
      score: node.score,
      path: [...path],
    });
  }

  return result;
}

export default function EvalChart({ root, position, onNavigate }: EvalChartProps) {
  const data = useMemo(() => buildMainlineData(root), [root]);

  const currentMoveIndex = useMemo(() => {
    return position.length;
  }, [position]);

  if (data.length === 0) {
    return <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>暂无评估数据</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="name" hide />
        <YAxis domain={[-5, 5]} hide />
        <Tooltip
          formatter={(value: number) => [`${value > 0 ? "+" : ""}${value}`, "评估"]
          }
          labelFormatter={(label: string) => `着法: ${label}`}
        />
        <ReferenceLine y={0} stroke="#666" />
        {currentMoveIndex > 0 && currentMoveIndex <= data.length && (
          <ReferenceLine
            x={data[currentMoveIndex - 1]?.name}
            stroke="var(--mantine-primary-color-filled)"
          />
        )}
        <Area
          type="monotone"
          dataKey="score"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#evalGradient)"
          onClick={(e: { activePayload?: { payload: DataPoint }[] }) => {
            if (e?.activePayload?.[0]?.payload) {
              onNavigate(e.activePayload[0].payload.path);
            }
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
