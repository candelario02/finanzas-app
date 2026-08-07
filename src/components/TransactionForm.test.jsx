import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionForm from "./TransactionForm";

const tags = ["Comida 🍔", "Generé 💰"];

describe("TransactionForm", () => {
  it("reusa una etiqueta al hacer clic", async () => {
    const user = userEvent.setup();
    const onRegistrar = vi.fn().mockResolvedValue(true);
    render(
      <TransactionForm
        tags={tags}
        onRegistrar={onRegistrar}
        onOpenTagEditor={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Comida 🍔"));
    expect(screen.getByPlaceholderText("Detalle...")).toHaveValue("Comida 🍔");
  });

  it("registra un ingreso y limpia los campos si la operación tiene éxito", async () => {
    const user = userEvent.setup();
    const onRegistrar = vi.fn().mockResolvedValue(true);
    render(
      <TransactionForm
        tags={tags}
        onRegistrar={onRegistrar}
        onOpenTagEditor={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText("Detalle..."), "Venta");
    await user.type(screen.getByPlaceholderText("Monto S/"), "50");
    await user.click(screen.getByText("Ingreso"));

    expect(onRegistrar).toHaveBeenCalledWith("Venta", "50", "ingreso");
    expect(screen.getByPlaceholderText("Detalle...")).toHaveValue("");
    expect(screen.getByPlaceholderText("Monto S/")).toHaveValue(null);
  });

  it("no limpia los campos si el registro falla", async () => {
    const user = userEvent.setup();
    const onRegistrar = vi.fn().mockResolvedValue(false);
    render(
      <TransactionForm
        tags={tags}
        onRegistrar={onRegistrar}
        onOpenTagEditor={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText("Detalle..."), "Falla");
    await user.type(screen.getByPlaceholderText("Monto S/"), "10");
    await user.click(screen.getByText("Gasto"));

    expect(onRegistrar).toHaveBeenCalledWith("Falla", "10", "gasto");
    expect(screen.getByPlaceholderText("Detalle...")).toHaveValue("Falla");
  });

  it("abre el editor de etiquetas con el botón de ajustes", async () => {
    const user = userEvent.setup();
    const onOpenTagEditor = vi.fn();
    render(
      <TransactionForm
        tags={tags}
        onRegistrar={vi.fn()}
        onOpenTagEditor={onOpenTagEditor}
      />,
    );

    await user.click(screen.getByRole("button", { name: "⚙️" }));
    expect(onOpenTagEditor).toHaveBeenCalledTimes(1);
  });
});
