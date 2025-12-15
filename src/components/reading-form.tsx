import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReadingSchema } from "@/lib/validations/readings";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import type { CreateReadingInput } from "@/lib/validations/readings";
import { toDatetimeLocalValue } from "@/lib/datetime-local";
import { Loader2 } from "lucide-react";

interface ReadingFormProps {
  onSuccess?: () => void;
  embedded?: boolean;
}

type EquipmentStatus = "regular" | "rollover" | "exchange";

export function ReadingForm({ onSuccess, embedded = false }: ReadingFormProps) {
  const [formData, setFormData] = useState({
    ts: toDatetimeLocalValue(),
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const parseDecimal = (raw: string) => parseFloat(raw.replace(",", ".").trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      let timestamp = formData.ts;
      if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+')) {
        timestamp = new Date(timestamp).toISOString();
      }
      
      const payload: CreateReadingInput = {
        ts: timestamp,
        hydrometer_m3: parseDecimal(formData.hydrometer_m3),
        horimeter_h: parseDecimal(formData.horimeter_h),
        notes: formData.notes.trim() || undefined,
        hydrometer_status: formData.hydrometer_status,
        horimeter_status: formData.horimeter_status,
      };

      if (formData.hydrometer_status === "exchange") {
        payload.hydrometer_final_old = parseDecimal(formData.hydrometer_final_old);
        payload.hydrometer_initial_new = parseDecimal(formData.hydrometer_initial_new);
      }

      if (formData.horimeter_status === "exchange") {
        payload.horimeter_final_old = parseDecimal(formData.horimeter_final_old);
        payload.horimeter_initial_new = parseDecimal(formData.horimeter_initial_new);
      }

      const validated = createReadingSchema.safeParse(payload);
      if (!validated.success) {
        const flattened = validated.error.flatten().fieldErrors;
        const nextErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(flattened)) {
          if (messages && messages.length > 0) nextErrors[key] = messages[0] ?? "Valor inválido";
        }
        setErrors(nextErrors);
        toast.error("Verifique os campos destacados");
        return;
      }

      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar leitura");
      }

      toast.success("Leitura cadastrada com sucesso!");
      setFormData({
        ts: toDatetimeLocalValue(),
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
    <FormContainer embedded={embedded}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ts">Data e Hora</Label>
            <Input
              id="ts"
              type="datetime-local"
              value={formData.ts}
              onChange={(e) => setField("ts", e.target.value)}
              required
            />
            {errors.ts ? <p className="text-xs text-destructive">{errors.ts}</p> : null}
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
                  onChange={(e) => setField("hydrometer_m3", e.target.value)}
                  placeholder="Ex: 1234.567"
                  required
                />
                {errors.hydrometer_m3 ? <p className="text-xs text-destructive">{errors.hydrometer_m3}</p> : null}
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
                      onChange={(e) => setField("hydrometer_final_old", e.target.value)}
                      required
                    />
                    {errors.hydrometer_final_old ? (
                      <p className="text-xs text-destructive">{errors.hydrometer_final_old}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hydrometer_initial_new">Inicial do Novo (m³)</Label>
                    <Input
                      id="hydrometer_initial_new"
                      type="number"
                      step="0.001"
                      value={formData.hydrometer_initial_new}
                      onChange={(e) => setField("hydrometer_initial_new", e.target.value)}
                      required
                    />
                    {errors.hydrometer_initial_new ? (
                      <p className="text-xs text-destructive">{errors.hydrometer_initial_new}</p>
                    ) : null}
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
                  onChange={(e) => setField("horimeter_h", e.target.value)}
                  placeholder="Ex: 5678.123"
                  required
                />
                {errors.horimeter_h ? <p className="text-xs text-destructive">{errors.horimeter_h}</p> : null}
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
                      onChange={(e) => setField("horimeter_final_old", e.target.value)}
                      required
                    />
                    {errors.horimeter_final_old ? (
                      <p className="text-xs text-destructive">{errors.horimeter_final_old}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horimeter_initial_new">Inicial do Novo (h)</Label>
                    <Input
                      id="horimeter_initial_new"
                      type="number"
                      step="0.001"
                      value={formData.horimeter_initial_new}
                      onChange={(e) => setField("horimeter_initial_new", e.target.value)}
                      required
                    />
                    {errors.horimeter_initial_new ? (
                      <p className="text-xs text-destructive">{errors.horimeter_initial_new}</p>
                    ) : null}
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
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Ex: Manutenção realizada..."
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Cadastrando..." : "Cadastrar Leitura"}
          </Button>
      </form>
    </FormContainer>
  );
}

function FormContainer({ embedded, children }: { embedded: boolean; children: React.ReactNode }) {
  if (embedded) return <div className="w-full">{children}</div>;
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Leitura</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
