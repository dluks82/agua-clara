"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
      onClick={() => window.print()}
    >
      Imprimir / Salvar PDF
    </button>
  );
}

