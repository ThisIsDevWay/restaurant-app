"use client";
 
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateEditor } from "@/components/admin/whatsapp/TemplateEditor";
import { WhatsAppStatus } from "@/components/admin/whatsapp/WhatsAppStatus";
import { Smartphone, Mail, Info } from "lucide-react";
import type { SettingsFormData, Template } from "./SettingsForm.types";
 
interface SettingsMessagingTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
  templates: Template[];
}
 
export function SettingsMessagingTab({ form, updateField, templates }: SettingsMessagingTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Card 1: Conexión y Notificaciones WhatsApp */}
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Servicio de Notificaciones WhatsApp
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Vincula tu línea telefónica de WhatsApp y configura el microservicio para automatizar el envío de tickets y confirmaciones a tus clientes.
        </p>
 
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Status Widget (col-span-2) */}
          <div className="lg:col-span-2 flex flex-col justify-center bg-bg-app/20 p-4 rounded-2xl border border-border/20 shadow-sm">
            <Label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-3 text-center lg:text-left">
              Estado de Conexión
            </Label>
            <div className="w-full flex items-center justify-center py-2">
              <WhatsAppStatus />
            </div>
          </div>
 
          {/* Inputs Grid (col-span-3) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Número de WhatsApp Principal</Label>
              <Input
                value={form.whatsappNumber}
                onChange={(e) => updateField("whatsappNumber", e.target.value)}
                placeholder="Ej. 584141234567"
                className="rounded-xl h-10 text-sm font-semibold"
              />
              <p className="text-[10px] text-text-muted">
                Registra el código de país sin el símbolo + (ej: 58 para Venezuela, seguido de tu número sin el 0).
              </p>
            </div>
 
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">URL del Microservicio (Baileys)</Label>
              <Input
                value={form.whatsappMicroserviceUrl}
                onChange={(e) => updateField("whatsappMicroserviceUrl", e.target.value)}
                placeholder="https://su-microservicio-baileys.com"
                className="rounded-xl h-10 font-mono text-xs"
              />
              <p className="text-[10px] text-text-muted">
                Endpoint API encargado del envío de mensajes y la generación del código QR.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Número WhatsApp del Repartidor
              </Label>
              <Input
                value={form.deliveryWhatsappNumber}
                onChange={(e) => updateField("deliveryWhatsappNumber", e.target.value)}
                placeholder="Ej. 584141234567"
                className="rounded-xl h-10 text-sm font-semibold"
              />
              <p className="text-[10px] text-text-muted">
                Cuando una orden de delivery entra a cocina, se enviará un mensaje automático a este número con los datos del pedido y entrega.
              </p>
            </div>
          </div>
        </div>
      </Card>
 
      {/* Card 2: Plantillas de Mensajería */}
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Plantillas de Mensajería Dinámica
        </h3>
        <p className="text-text-muted text-xs mb-5">
          Personaliza los textos automáticos de los mensajes que reciben tus clientes al confirmar su compra o al cambiar el estado de su orden.
        </p>
        
        <div className="flex items-start gap-3 p-4 bg-bg-app/40 border border-border/20 rounded-2xl mb-6 text-xs text-text-muted leading-relaxed font-medium shadow-sm">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            Puedes usar marcadores de posición dinámicos como <code className="bg-bg-app px-1.5 py-0.5 rounded font-mono font-bold text-primary">{"{orderId}"}</code>, <code className="bg-bg-app px-1.5 py-0.5 rounded font-mono font-bold text-primary">{"{customerName}"}</code>, o <code className="bg-bg-app px-1.5 py-0.5 rounded font-mono font-bold text-primary">{"{totalAmount}"}</code>. El sistema reemplazará estas variables dinámicamente al generar el mensaje.
          </div>
        </div>
 
        <div className="border border-border/20 rounded-2xl p-4 bg-bg-app/5">
          <TemplateEditor templates={templates} />
        </div>
      </Card>
    </div>
  );
}

