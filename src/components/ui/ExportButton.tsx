import * as React from "react";
import { Button } from "./Button";

export function ExportButton({
  onExport,
  disabled = false,
  children = "Export CSV",
}: {
  onExport: () => Promise<void>;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleExport}
      loading={loading}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
