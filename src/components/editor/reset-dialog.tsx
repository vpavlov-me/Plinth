"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { resetProject } from "@/editor/actions";
import { useUIStore } from "@/editor/ui-store";

/** Confirms "Reset project" before the scene and its screenshots are cleared. */
export function ResetDialog() {
  const open = useUIStore((s) => s.dialog === "reset");
  const setDialog = useUIStore((s) => s.setDialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog(next ? "reset" : null)}
      title="Reset the project?"
      description="The canvas, background, devices and screenshots go back to the defaults. Your library is kept."
      className="w-[400px]"
      footer={
        <>
          <DialogClose render={<Button>Cancel</Button>} />
          <Button
            variant="danger"
            onClick={() => {
              setDialog(null);
              resetProject();
            }}
          >
            Reset
          </Button>
        </>
      }
    />
  );
}
