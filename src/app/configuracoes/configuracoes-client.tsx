"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Save, AlertTriangle, Settings, Bell, BarChart3, Loader2, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpHint } from "@/components/help-hint";

interface SettingsData {
  // Alertas
  alert_flow_drop_threshold?: string;
  alert_cov_threshold?: string;
  alert_enabled?: string;

  // Faturamento
  billing_cycle_day?: string;
  
  // Baseline
  baseline_days?: string;
  baseline_min_intervals?: string;
  
  // Sistema
  system_name?: string;
  system_description?: string;
  export_format?: string;
}

export default function ConfiguracoesClient() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");
      
      if (!response.ok) {
        throw new Error("Erro ao carregar configurações");
      }
      
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar configurações");
      }
      
      setMessage({
        type: "success",
        text: "Configurações salvas com sucesso!"
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: String(value)
    }));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize os parâmetros do sistema
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Carregando configurações...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Configurações</h1>
            <p className="text-muted-foreground">
              Personalize os parâmetros do sistema de monitoramento
            </p>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto" aria-label="Salvar configurações">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurações de Faturamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="billing_cycle_day">Dia de Fechamento</Label>
                <HelpHint
                  label="Ajuda: dia de fechamento"
                  content={
                    <p>
                      Define o início do ciclo mensal de faturamento/monitoramento (usado na navegação de períodos do
                      dashboard).
                    </p>
                  }
                />
              </div>
              <Select
                value={settings.billing_cycle_day || "1"}
                onValueChange={(value) => handleInputChange("billing_cycle_day", value)}
              >
                <SelectTrigger id="billing_cycle_day">
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={d.toString()}>
                      Dia {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define o início do ciclo mensal de faturamento/monitoramento.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="alert_enabled">Alertas Ativados</Label>
                <HelpHint
                  label="Ajuda: alertas ativados"
                  content={
                    <p>
                      Liga ou desliga o sistema de alertas. Quando desativado, nenhum alerta será gerado, mesmo que as
                      condições sejam atendidas.
                    </p>
                  }
                />
              </div>
              <Switch
                id="alert_enabled"
                checked={settings.alert_enabled === "true"}
                onCheckedChange={(checked) => handleInputChange("alert_enabled", checked)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="alert_flow_drop_threshold">
                  Limiar de Queda de Vazão (%)
                </Label>
                <HelpHint
                  label="Ajuda: limiar de queda de vazão"
                  content={
                    <p>
                      Percentual de queda da vazão em relação ao baseline para gerar alerta. Exemplo: 10% significa que
                      se a vazão cair 10% ou mais do valor de referência, um alerta será disparado.
                    </p>
                  }
                />
              </div>
              <Input
                id="alert_flow_drop_threshold"
                type="number"
                value={settings.alert_flow_drop_threshold || "10"}
                onChange={(e) => handleInputChange("alert_flow_drop_threshold", e.target.value)}
                placeholder="10"
                min="1"
                max="50"
              />
              <p className="text-xs text-muted-foreground">
                Alerta quando vazão cair abaixo de X% do baseline
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="alert_cov_threshold">
                  Limiar de COV (%)
                </Label>
                <HelpHint
                  label="Ajuda: limiar de COV"
                  content={
                    <p>
                      Coeficiente de Variação (COV) mede a estabilidade do sistema. Valores baixos (5-10%) indicam
                      operação estável, valores altos (&gt;15%) indicam oscilações que podem gerar alertas.
                    </p>
                  }
                />
              </div>
              <Input
                id="alert_cov_threshold"
                type="number"
                value={settings.alert_cov_threshold || "15"}
                onChange={(e) => handleInputChange("alert_cov_threshold", e.target.value)}
                placeholder="15"
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Alerta quando Coeficiente de Variação exceder X%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Baseline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Baseline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="baseline_days">
                  Período do Baseline (dias)
                </Label>
                <HelpHint
                  label="Ajuda: período do baseline"
                  content={
                    <p>
                      Número de dias para calcular o valor de referência (baseline). O sistema analisa os dados dos
                      últimos X dias para estabelecer um padrão de operação normal.
                    </p>
                  }
                />
              </div>
              <Input
                id="baseline_days"
                type="number"
                value={settings.baseline_days || "7"}
                onChange={(e) => handleInputChange("baseline_days", e.target.value)}
                placeholder="7"
                min="1"
                max="30"
              />
              <p className="text-xs text-muted-foreground">
                Número de dias para calcular o baseline
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="baseline_min_intervals">
                  Mínimo de Intervalos
                </Label>
                <HelpHint
                  label="Ajuda: mínimo de intervalos"
                  content={
                    <p>
                      Número mínimo de intervalos válidos necessários para calcular o baseline. Garante que o valor de
                      referência seja baseado em dados suficientes para ser confiável.
                    </p>
                  }
                />
              </div>
              <Input
                id="baseline_min_intervals"
                type="number"
                value={settings.baseline_min_intervals || "5"}
                onChange={(e) => handleInputChange("baseline_min_intervals", e.target.value)}
                placeholder="5"
                min="1"
                max="50"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo de intervalos para calcular baseline
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="system_name">
                  Nome do Sistema
                </Label>
                <HelpHint
                  label="Ajuda: nome do sistema"
                  content={
                    <p>
                      Nome identificador do sistema de monitoramento. Aparece no cabeçalho da aplicação e nos relatórios
                      exportados.
                    </p>
                  }
                />
              </div>
              <Input
                id="system_name"
                value={settings.system_name || "Água Clara"}
                onChange={(e) => handleInputChange("system_name", e.target.value)}
                placeholder="Água Clara"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="system_description">
                  Descrição
                </Label>
                <HelpHint
                  label="Ajuda: descrição"
                  content={
                    <p>
                      Descrição detalhada do sistema. Aparece na página inicial e ajuda a identificar o propósito
                      específico do monitoramento.
                    </p>
                  }
                />
              </div>
              <Input
                id="system_description"
                value={settings.system_description || "Sistema de Monitoramento de Água"}
                onChange={(e) => handleInputChange("system_description", e.target.value)}
                placeholder="Sistema de Monitoramento de Água"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="export_format">
                  Formato de Exportação
                </Label>
                <HelpHint
                  label="Ajuda: formato de exportação"
                  content={
                    <p>
                      Formato padrão para exportação de dados. CSV é mais universal, Excel oferece melhor formatação para
                      planilhas.
                    </p>
                  }
                />
              </div>
              <select
                id="export_format"
                value={settings.export_format || "csv"}
                onChange={(e) => handleInputChange("export_format", e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Configurações Avançadas */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Avançadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Configurações técnicas do sistema:</p>
              <ul className="mt-2 space-y-1">
                <li>• Precisão dos cálculos: 3 casas decimais</li>
                <li>• Timezone: UTC (conversão automática)</li>
                <li>• Validação de monotonicidade: Ativa</li>
                <li>• Cache de cálculos: 5 minutos</li>
              </ul>
            </div>
            
            <Separator />
            
            <div className="text-xs text-muted-foreground">
              <p><strong>Dica:</strong> Ajuste os limiares de alerta baseado no comportamento histórico do seu sistema.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </TooltipProvider>
  );
}
