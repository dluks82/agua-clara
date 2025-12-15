"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, AlertTriangle, Loader2 } from "lucide-react";
import { toDatetimeLocalValue } from "@/lib/datetime-local";

interface Reading {
  id: number;
  ts: string;
  hydrometer_m3: string;
  horimeter_h: string;
  notes: string | null;
}

interface ReadingEditFormProps {
  reading: Reading;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReadingEditForm({ reading, onSuccess, onCancel }: ReadingEditFormProps) {
  const [formData, setFormData] = useState({
    ts: toDatetimeLocalValue(new Date(reading.ts)),
    hydrometer_m3: reading.hydrometer_m3,
    horimeter_h: reading.horimeter_h,
    notes: reading.notes || "",
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const parseDecimal = (raw: string) => parseFloat(raw.replace(",", ".").trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      // Converter timestamp para formato ISO se necessário
      let timestamp = formData.ts;
      if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+')) {
        timestamp = new Date(timestamp).toISOString();
      }

      const hydrometer = parseDecimal(formData.hydrometer_m3);
      const horimeter = parseDecimal(formData.horimeter_h);
      const nextFieldErrors: Record<string, string> = {};
      if (!formData.ts || isNaN(new Date(formData.ts).getTime())) nextFieldErrors.ts = "Data/hora inválida";
      if (Number.isNaN(hydrometer) || hydrometer < 0) nextFieldErrors.hydrometer_m3 = "Valor inválido";
      if (Number.isNaN(horimeter) || horimeter < 0) nextFieldErrors.horimeter_h = "Valor inválido";
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        setSubmitting(false);
        return;
      }

      const response = await fetch(`/api/readings/${reading.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ts: timestamp,
          hydrometer_m3: hydrometer,
          horimeter_h: horimeter,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao atualizar leitura");
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ts">Data/Hora</Label>
          <Input
            id="ts"
            type="datetime-local"
            value={formData.ts}
            onChange={(e) => handleInputChange("ts", e.target.value)}
            required
          />
          {fieldErrors.ts ? <p className="text-xs text-destructive">{fieldErrors.ts}</p> : null}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hydrometer_m3">Hidrômetro (m³)</Label>
          <Input
            id="hydrometer_m3"
            type="number"
            step="0.001"
            value={formData.hydrometer_m3}
            onChange={(e) => handleInputChange("hydrometer_m3", e.target.value)}
            placeholder="0.000"
            required
          />
          {fieldErrors.hydrometer_m3 ? (
            <p className="text-xs text-destructive">{fieldErrors.hydrometer_m3}</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="horimeter_h">Horímetro (h)</Label>
          <Input
            id="horimeter_h"
            type="number"
            step="0.001"
            value={formData.horimeter_h}
            onChange={(e) => handleInputChange("horimeter_h", e.target.value)}
            placeholder="0.000"
            required
          />
          {fieldErrors.horimeter_h ? <p className="text-xs text-destructive">{fieldErrors.horimeter_h}</p> : null}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Observações opcionais..."
            rows={1}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {submitting ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
