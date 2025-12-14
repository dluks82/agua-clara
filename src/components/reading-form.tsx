import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReadingSchema } from "@/lib/validations/readings";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface ReadingFormProps {
  onSuccess?: () => void;
}

type EquipmentStatus = "regular" | "rollover" | "exchange";

export function ReadingForm({ onSuccess }: ReadingFormProps) {
  const [formData, setFormData] = useState({
    ts: new Date().toISOString().slice(0, 16),
    hydrometer_m3: "",
    horimeter_h: "",
    notes: "",
    hydrometer_status: "regular" as EquipmentStatus,
    horimeter_status: "regular" as EquipmentStatus,
    hydrometer_final_old: "",
    hydrometer_initial_new: "",
    horimeter_final_old: "",
    horimeter_initial_new: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let timestamp = formData.ts;
      if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+')) {
        timestamp = new Date(timestamp).toISOString();
      }
      
      const payload: any = {
        ts: timestamp,
        hydrometer_m3: parseFloat(formData.hydrometer_m3),
        horimeter_h: parseFloat(formData.horimeter_h),
        notes: formData.notes,
        hydrometer_status: formData.hydrometer_status,
        horimeter_status: formData.horimeter_status,
      };

      if (formData.hydrometer_status === "exchange") {
        payload.hydrometer_final_old = parseFloat(formData.hydrometer_final_old);
        payload.hydrometer_initial_new = parseFloat(formData.hydrometer_initial_new);
      }

      if (formData.horimeter_status === "exchange") {
        payload.horimeter_final_old = parseFloat(formData.horimeter_final_old);
        payload.horimeter_initial_new = parseFloat(formData.horimeter_initial_new);
      }

      const validatedData = createReadingSchema.parse(payload);

      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar leitura");
      }

      toast.success("Leitura cadastrada com sucesso!");
      setFormData({
        ts: new Date().toISOString().slice(0, 16),
        hydrometer_m3: "",
        horimeter_h: "",
        notes: "",
        hydrometer_status: "regular",
        horimeter_status: "regular",
        hydrometer_final_old: "",
        hydrometer_initial_new: "",
        horimeter_final_old: "",
        horimeter_initial_new: "",
      });
      
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Leitura</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ts">Data e Hora</Label>
            <Input
              id="ts"
              type="datetime-local"
              value={formData.ts}
              onChange={(e) => setFormData({ ...formData, ts: e.target.value })}
              required
            />
          </div>

          <Separator />

          {/* Hidrômetro Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Hidrômetro (Volume)</Label>
              <div className="w-40">
                <Select
                  value={formData.hydrometer_status}
                  onValueChange={(val: EquipmentStatus) => setFormData({ ...formData, hydrometer_status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Leitura Regular</SelectItem>
                    <SelectItem value="rollover">Virada (Zerou)</SelectItem>
                    <SelectItem value="exchange">Troca de Medidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hydrometer_m3">Leitura Atual (m³)</Label>
                <Input
                  id="hydrometer_m3"
                  type="number"
                  step="0.001"
                  value={formData.hydrometer_m3}
                  onChange={(e) => setFormData({ ...formData, hydrometer_m3: e.target.value })}
                  placeholder="Ex: 1234.567"
                  required
                />
              </div>
              
              {formData.hydrometer_status === "exchange" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="hydrometer_final_old">Final do Antigo (m³)</Label>
                    <Input
                      id="hydrometer_final_old"
                      type="number"
                      step="0.001"
                      value={formData.hydrometer_final_old}
                      onChange={(e) => setFormData({ ...formData, hydrometer_final_old: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hydrometer_initial_new">Inicial do Novo (m³)</Label>
                    <Input
                      id="hydrometer_initial_new"
                      type="number"
                      step="0.001"
                      value={formData.hydrometer_initial_new}
                      onChange={(e) => setFormData({ ...formData, hydrometer_initial_new: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Horímetro Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Horímetro (Horas)</Label>
              <div className="w-40">
                <Select
                  value={formData.horimeter_status}
                  onValueChange={(val: EquipmentStatus) => setFormData({ ...formData, horimeter_status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Leitura Regular</SelectItem>
                    <SelectItem value="rollover">Virada (Zerou)</SelectItem>
                    <SelectItem value="exchange">Troca de Medidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="horimeter_h">Leitura Atual (h)</Label>
                <Input
                  id="horimeter_h"
                  type="number"
                  step="0.001"
                  value={formData.horimeter_h}
                  onChange={(e) => setFormData({ ...formData, horimeter_h: e.target.value })}
                  placeholder="Ex: 5678.123"
                  required
                />
              </div>

              {formData.horimeter_status === "exchange" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="horimeter_final_old">Final do Antigo (h)</Label>
                    <Input
                      id="horimeter_final_old"
                      type="number"
                      step="0.001"
                      value={formData.horimeter_final_old}
                      onChange={(e) => setFormData({ ...formData, horimeter_final_old: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horimeter_initial_new">Inicial do Novo (h)</Label>
                    <Input
                      id="horimeter_initial_new"
                      type="number"
                      step="0.001"
                      value={formData.horimeter_initial_new}
                      onChange={(e) => setFormData({ ...formData, horimeter_initial_new: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Ex: Manutenção realizada..."
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Cadastrando..." : "Cadastrar Leitura"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
