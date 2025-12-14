"use client";

import { useState } from "react";
import { ReadingForm } from "@/components/reading-form";
import { ReadingsList } from "@/components/readings-list";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function LeiturasPage() {
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leituras</h1>
          <p className="text-muted-foreground">
            Gerencie as leituras do hidrômetro e horímetro
          </p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Leitura
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Leitura</DialogTitle>
            </DialogHeader>
            <ReadingForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>
      
      <ReadingsList refreshTrigger={refreshTrigger} />
    </div>
  );
}
