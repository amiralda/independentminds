import { useState } from "react";
import { AddStudentChoice } from "./AddStudentChoice";
import { AddStudentFullForm } from "./AddStudentFullForm";
import { AddStudentQuickCreate } from "./AddStudentQuickCreate";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = "choice" | "full" | "quick";

export function AddStudentForm({ open, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("choice");

  const handleClose = () => {
    setMode("choice");
    onClose();
  };

  return (
    <>
      <AddStudentChoice
        open={open && mode === "choice"}
        onClose={handleClose}
        onChooseFullForm={() => setMode("full")}
        onChooseQuickCreate={() => setMode("quick")}
      />
      <AddStudentFullForm
        open={open && mode === "full"}
        onClose={handleClose}
        onBack={() => setMode("choice")}
      />
      <AddStudentQuickCreate
        open={open && mode === "quick"}
        onClose={handleClose}
        onBack={() => setMode("choice")}
      />
    </>
  );
}
