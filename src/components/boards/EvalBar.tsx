import { Box, Text } from "@mantine/core";

interface EvalBarProps {
  score: number; // centipawn, positive = red advantage
  orientation?: "red" | "black";
}

function getWinChance(cp: number): number {
  // Sigmoid-like transform to [0, 100]
  return Math.max(0, Math.min(100, 50 + 50 * Math.tanh(cp / 400)));
}

export default function EvalBar({ score, orientation = "red" }: EvalBarProps) {
  const redWinChance = getWinChance(score);
  const blackWinChance = 100 - redWinChance;

  // If orientation is black, flip the bar
  const topChance = orientation === "red" ? blackWinChance : redWinChance;
  const bottomChance = orientation === "red" ? redWinChance : blackWinChance;

  return (
    <Box
      style={{
        width: 25,
        height: "100%",
        borderRadius: "var(--mantine-radius-xs)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Black/top section */}
      <Box
        style={{
          height: `${topChance}%`,
          backgroundColor: "#1a1a1a",
          transition: "height 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {topChance > 30 && (
          <Text size="xs" c="white" fw={700} style={{ writingMode: "vertical-rl" }}>
            {score > 0 && orientation === "black" ? `+${(score / 100).toFixed(1)}` : ""}
            {score < 0 && orientation === "red" ? `${(score / 100).toFixed(1)}` : ""}
          </Text>
        )}
      </Box>
      {/* Red/bottom section */}
      <Box
        style={{
          height: `${bottomChance}%`,
          backgroundColor: "#c83232",
          transition: "height 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {bottomChance > 30 && (
          <Text size="xs" c="white" fw={700} style={{ writingMode: "vertical-rl" }}>
            {score > 0 && orientation === "red" ? `+${(score / 100).toFixed(1)}` : ""}
            {score < 0 && orientation === "black" ? `${(score / 100).toFixed(1)}` : ""}
          </Text>
        )}
      </Box>
    </Box>
  );
}
