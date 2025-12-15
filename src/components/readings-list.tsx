"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { RefreshCw, Trash2, Edit, Loader2 } from "lucide-react";
import { ReadingEditForm } from "@/components/reading-edit-form";

interface Reading {
  id: number;
  ts: string;
  hydrometer_m3: string;
  horimeter_h: string;
  notes: string | null;
}

interface ReadingsListProps {
  refreshTrigger?: number;
  canWrite?: boolean;
}

export function ReadingsList({ refreshTrigger, canWrite = true }: ReadingsListProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [readingToDelete, setReadingToDelete] = useState<Reading | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [readingToEdit, setReadingToEdit] = useState<Reading | null>(null);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/readings");
      
      if (!response.ok) {
        throw new Error("Erro ao carregar leituras");
      }
      
      const data = await response.json();
      setReadings(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (reading: Reading) => {
    setReadingToDelete(reading);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!readingToDelete) return;

    try {
      setDeletingId(readingToDelete.id);
      
      const response = await fetch(`/api/readings/${readingToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir leitura");
      }

      // Recarregar a lista
      await fetchReadings();
      setShowDeleteDialog(false);
      setReadingToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setReadingToDelete(null);
  };

  const handleEditClick = (reading: Reading) => {
    setReadingToEdit(reading);
    setShowEditDialog(true);
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setReadingToEdit(null);
    fetchReadings();
  };

  const handleEditCancel = () => {
    setShowEditDialog(false);
    setReadingToEdit(null);
  };

  useEffect(() => {
    fetchReadings();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leituras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando leituras...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leituras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>Erro ao carregar leituras: {error}</p>
            <Button onClick={fetchReadings} className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leituras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma leitura cadastrada ainda.</p>
            <p className="text-sm">Cadastre a primeira leitura para começar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Leituras ({readings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:hidden">
            {readings.map((reading) => (
              <div key={reading.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {format(new Date(reading.ts), "dd/MM/yyyy HH:mm")}
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Hidrômetro:</span>{" "}
                        <span className="font-mono">
                          {parseFloat(reading.hydrometer_m3).toFixed(3)}
                        </span>{" "}
                        m³
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Horímetro:</span>{" "}
                        <span className="font-mono">
                          {parseFloat(reading.horimeter_h).toFixed(3)}
                        </span>{" "}
                        h
                      </div>
                    </div>
                    {reading.notes ? (
                      <div className="mt-2 text-sm text-muted-foreground">{reading.notes}</div>
                    ) : null}
                  </div>

                  {canWrite ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Editar"
                        onClick={() => handleEditClick(reading)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Excluir"
                        onClick={() => handleDeleteClick(reading)}
                        disabled={deletingId === reading.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden rounded-md border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Hidrômetro (m³)</TableHead>
                  <TableHead>Horímetro (h)</TableHead>
                  <TableHead>Observações</TableHead>
                  {canWrite && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((reading) => (
                  <TableRow key={reading.id}>
                    <TableCell>{format(new Date(reading.ts), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-mono">
                      {parseFloat(reading.hydrometer_m3).toFixed(3)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {parseFloat(reading.horimeter_h).toFixed(3)}
                    </TableCell>
                    <TableCell>{reading.notes || "-"}</TableCell>
                    {canWrite && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(reading)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(reading)}
                            disabled={deletingId === reading.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canWrite && (
        <>
          {/* Dialog de Confirmação */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Tem certeza que deseja excluir esta leitura?
                </p>
                {readingToDelete && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p><strong>Data/Hora:</strong> {format(new Date(readingToDelete.ts), "dd/MM/yyyy HH:mm")}</p>
                    <p><strong>Hidrômetro:</strong> {parseFloat(readingToDelete.hydrometer_m3).toFixed(3)} m³</p>
                    <p><strong>Horímetro:</strong> {parseFloat(readingToDelete.horimeter_h).toFixed(3)} h</p>
                  </div>
                )}
                <p className="text-sm text-destructive mt-2">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleDeleteCancel} disabled={deletingId !== null}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deletingId !== null}
                >
                  {deletingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {deletingId !== null ? "Excluindo..." : "Excluir"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Leitura</DialogTitle>
              </DialogHeader>
              {readingToEdit && (
                <ReadingEditForm
                  reading={readingToEdit}
                  onSuccess={handleEditSuccess}
                  onCancel={handleEditCancel}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
