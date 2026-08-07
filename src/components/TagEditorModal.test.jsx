import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagEditorModal from "./TagEditorModal";

describe("TagEditorModal", () => {
  it("guarda las etiquetas editadas", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TagEditorModal
        initialValue="Comida,  Diversión "
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Sepáralas con coma");
    expect(input).toHaveValue("Comida,  Diversión ");

    await user.click(screen.getByText("Guardar"));
    expect(onSave).toHaveBeenCalledWith("Comida,  Diversión ");
  });

  it("cancela sin guardar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TagEditorModal
        initialValue="Comida"
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
