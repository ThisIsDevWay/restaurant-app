"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateEditor } from "@/components/admin/whatsapp/TemplateEditor";
import { WhatsAppStatus } from "@/components/admin/whatsapp/WhatsAppStatus";
import type { SettingsFormData, Template } from "./SettingsForm.types";

interface SettingsMessagingTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
  templates: Template[];
}

export function SettingsMessagingTab({ form, updateField, templates }: SettingsMessagingTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Card className="p-4 border-none shadow-sm bg-white rounded-2xl">
        <WhatsAppStatus />
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">WhatsApp y Notificaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label className="font-bold">Número de WhatsApp (Notificaciones)</Label>
            <Input
              value={form.whatsappNumber}
              onChange={(e) => updateField("whatsappNumber", e.target.value)}
              placeholder="Ej. 584141234567"
              className="rounded-xl h-10"
            />
            <p className="text-xs text-text-muted italic">Incluye el código de país sin el símbolo + (ejemplo 584141234567)</p>
          </div>
          <div className="space-y-2">
            <Label className="font-bold">URL Microservicio Baileys</Label>
            <Input
              value={form.whatsappMicroserviceUrl}
              onChange={(e) => updateField("whatsappMicroserviceUrl", e.target.value)}
              placeholder="https://su-microservicio.com"
              className="rounded-xl h-10 font-mono text-xs"
            />
            <p className="text-xs text-text-muted">Necesario para automatizar el envío de tickets.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Plantillas de Mensajería</h3>
        <p className="text-sm text-text-muted mb-8 p-4 bg-bg-app rounded-xl border border-border/40">
          Personaliza los mensajes automáticos que reciben tus clientes. Usa las variables dinámicas para personalizar cada envío.
        </p>
        <TemplateEditor templates={templates} />
      </Card>
    </div>
  );
}
