import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import "@/i18n/config";

import { RadarFilters } from "@/features/dashboard/components/RadarFilters";

describe("RadarFilters", () => {
  it("emite período, classe e confiança como valores tipados", () => {
    const onChange = vi.fn();
    render(<RadarFilters filter={{ periodHours: 24, assetClass: null, minimumConfidence: 0 }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Período de contexto" }), { target: { value: "168" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Classe de ativo" }), { target: { value: "crypto" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Confiança mínima" }), { target: { value: "0.7" } });
    expect(onChange).toHaveBeenNthCalledWith(1, "periodHours", 168);
    expect(onChange).toHaveBeenNthCalledWith(2, "assetClass", "crypto");
    expect(onChange).toHaveBeenNthCalledWith(3, "minimumConfidence", 0.7);
  });
});
