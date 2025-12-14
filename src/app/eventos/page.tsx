"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calendar, Wrench, Settings, AlertTriangle, HelpCircle, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Event {
  id: number;
  ts: string;
  type: string;
  payload: {
    description?: string;
    details?: string;
  } | null;
}

interface EventFormData {
  ts: string;
  type: string;
  description: string;
  details: string;
}

export default function EventosPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
  const [formData, setFormData] = useState<EventFormData>({
    ts: new Date().toISOString().slice(0, 16),
    type: "",
    description: "",
    details: "",
  });

  const eventTypes = [
    { value: "troca_hidrometro", label: "Troca de Hidrômetro", icon: "🔧" },
    { value: "troca_horimetro", label: "Troca de Horímetro", icon: "⏱️" },
    { value: "manutencao", label: "Manutenção", icon: "🔨" },
    { value: "calibracao", label: "Calibração", icon: "⚙️" },
    { value: "outro", label: "Outro", icon: "📝" },
  ];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events");
      
      if (!response.ok) {
        throw new Error("Erro ao carregar eventos");
      }
      
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // Converter timestamp para formato ISO se necessário
      let timestamp = formData.ts;
      if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+')) {
        timestamp = new Date(timestamp).toISOString();
      }
      
      const payload = {
        description: formData.description,
        details: formData.details,
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ts: timestamp,
          type: formData.type,
          payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar evento");
      }

      setMessage({ type: "success", text: "Evento registrado com sucesso!" });
      setFormData({
        ts: new Date().toISOString().slice(0, 16),
        type: "",
        description: "",
        details: "",
      });
      setShowForm(false);
      fetchEvents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    const payload = (event.payload ?? {}) as { description?: string; details?: string };
    setFormData({
      ts: new Date(event.ts).toISOString().slice(0, 16),
      type: event.type,
      description: payload.description || "",
      details: payload.details || "",
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (!editingEvent) return;

      // Converter timestamp para formato ISO se necessário
      let timestamp = formData.ts;
      if (timestamp && !timestamp.includes('Z') && !timestamp.includes('+')) {
        timestamp = new Date(timestamp).toISOString();
      }
      
      const payload = {
        description: formData.description,
        details: formData.details,
      };

      const response = await fetch("/api/events", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEvent.id,
          ts: timestamp,
          type: formData.type,
          payload,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar evento");
      }

      setMessage({ type: "success", text: "Evento atualizado com sucesso!" });
      setFormData({
        ts: new Date().toISOString().slice(0, 16),
        type: "",
        description: "",
        details: "",
      });
      setShowEditForm(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`Tem certeza que deseja excluir o evento "${getEventTypeInfo(event.type).label}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir evento");
      }

      setMessage({ type: "success", text: "Evento excluído com sucesso!" });
      fetchEvents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erro inesperado"
      });
    }
  };

  const getEventTypeInfo = (type: string) => {
    return eventTypes.find(et => et.value === type) || { label: type, icon: "📝" };
  };

  const getEventTypeColor = (type: string) => {
    const colors = {
      troca_hidrometro: "bg-blue-100 text-blue-800",
      troca_horimetro: "bg-green-100 text-green-800", 
      manutencao: "bg-orange-100 text-orange-800",
      calibracao: "bg-purple-100 text-purple-800",
      outro: "bg-gray-100 text-gray-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos</h1>
          <p className="text-muted-foreground">
            Registre e acompanhe eventos do sistema
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Carregando eventos...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Eventos</h1>
            <p className="text-muted-foreground">
              Registre e acompanhe eventos do sistema de monitoramento
            </p>
          </div>
          
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Novo Evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ts">Data/Hora</Label>
                    <Input
                      id="ts"
                      type="datetime-local"
                      value={formData.ts}
                      onChange={(e) => setFormData(prev => ({ ...prev, ts: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="type">Tipo de Evento</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Selecione o tipo de evento que melhor descreve a situação. 
                            Isso ajuda na organização e análise dos dados.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Breve descrição do evento"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="details">Detalhes</Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Detalhes adicionais, observações, etc."
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Registrando..." : "Registrar Evento"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Histórico de Eventos ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum evento registrado ainda</p>
                <p className="text-sm">Clique em &quot;Novo Evento&quot; para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const typeInfo = getEventTypeInfo(event.type);
                    const payload = (event.payload ?? {}) as { description?: string; details?: string };
                    
                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          {format(new Date(event.ts), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge className={getEventTypeColor(event.type)}>
                            <span className="mr-1">{typeInfo.icon}</span>
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {payload.description || "Sem descrição"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payload.details || "Sem detalhes"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteEvent(event)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Evento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_ts">Data/Hora</Label>
                  <Input
                    id="edit_ts"
                    type="datetime-local"
                    value={formData.ts}
                    onChange={(e) => setFormData(prev => ({ ...prev, ts: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit_type">Tipo de Evento</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Selecione o tipo de evento que melhor descreve a situação. 
                          Isso ajuda na organização e análise dos dados.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_description">Descrição</Label>
                <Input
                  id="edit_description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descrição do evento"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit_details">Detalhes</Label>
                <Textarea
                  id="edit_details"
                  value={formData.details}
                  onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Detalhes adicionais, observações, etc."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
