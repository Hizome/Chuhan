import { Mosaic, type MosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import type { ViewId } from "../../state/uiStore";

interface MosaicLayoutProps {
  value: MosaicNode<ViewId>;
  onChange: (node: MosaicNode<ViewId>) => void;
}

export default function MosaicLayout({ value, onChange }: MosaicLayoutProps) {
  return (
    <Mosaic<ViewId>
      renderTile={(id) => (
        <div
          id={id}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        />
      )}
      value={value}
      onChange={onChange}
      resize={{ minimumPaneSizePercentage: 5 }}
      className="mosaic-blueprint-theme"
    />
  );
}
