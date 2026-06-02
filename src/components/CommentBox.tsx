import { Paper, Textarea, Button, Stack, Text } from "@mantine/core";

interface CommentBoxProps {
  comment: string;
  onChange: (comment: string) => void;
}

export default function CommentBox({ comment, onChange }: CommentBoxProps) {
  return (
    <Paper withBorder p="xs" style={{ height: "100%" }}>
      <Stack gap="xs" style={{ height: "100%" }}>
        <Text fw={700} size="sm">
          注释
        </Text>
        <Textarea
          value={comment}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder="在此输入注释..."
          styles={{
            wrapper: { flex: 1 },
            input: { height: "100%" },
          }}
          resize="vertical"
        />
        <Button size="compact-sm" onClick={() => onChange(comment)}>
          保存注释
        </Button>
      </Stack>
    </Paper>
  );
}
