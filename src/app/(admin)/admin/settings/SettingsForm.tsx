"use client";

import {
  Settings,
  Package,
  CreditCard,
  Smartphone,
  ListFilter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useSettingsForm } from "@/hooks/useSettingsForm";
import { SettingsGeneralTab } from "./SettingsGeneralTab";
import { SettingsOperationTab } from "./SettingsOperationTab";
import { SettingsPaymentsTab } from "./SettingsPaymentsTab";
import { SettingsMessagingTab } from "./SettingsMessagingTab";
import { SettingsDesignTab } from "./SettingsDesignTab";
import { SettingsSaveBar } from "./SettingsSaveBar";
import type { SettingsFormProps } from "./SettingsForm.types";

export function SettingsForm({ initialData, templates = [] }: SettingsFormProps) {
  const {
    form,
    updateField,
    isSaving,
    message,
    errors,
    decimalInputs,
    setDecimalInputs,
    handleSubmit,
  } = useSettingsForm({ initialData });

  return (
    <div className="relative pb-24">
      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={cn(
            "rounded-xl p-4 text-sm font-semibold animate-in fade-in slide-in-from-top-2 mb-6",
            message.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
          )}>
            {message.text}
          </div>
        )}

        <Tabs defaultValue="general" className="w-full flex flex-col gap-0">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-10 bg-muted/50 p-1 rounded-2xl h-auto border-none !w-full">
            <TabsTrigger value="general" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="design" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all hidden md:flex">
              <ListFilter className="h-4 w-4 mr-2" />
              Diseño
            </TabsTrigger>
            <TabsTrigger value="operation" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Package className="h-4 w-4 mr-2" />
              Operación
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="messaging" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Smartphone className="h-4 w-4 mr-2" />
              Mensajería
            </TabsTrigger>
            <TabsTrigger value="design" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all md:hidden">
              <ListFilter className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design">
            <SettingsDesignTab form={form} updateField={updateField} />
          </TabsContent>

          <TabsContent value="general">
            <SettingsGeneralTab form={form} updateField={updateField} errors={errors} />
          </TabsContent>

          <TabsContent value="operation">
            <SettingsOperationTab
              form={form}
              updateField={updateField}
              errors={errors}
              decimalInputs={decimalInputs}
              setDecimalInputs={setDecimalInputs}
            />
          </TabsContent>

          <TabsContent value="payments">
            <SettingsPaymentsTab form={form} updateField={updateField} />
          </TabsContent>

          <TabsContent value="messaging">
            <SettingsMessagingTab form={form} updateField={updateField} templates={templates} />
          </TabsContent>
        </Tabs>

        <div className="h-32" />
        <SettingsSaveBar isSaving={isSaving} onDiscard={() => window.location.reload()} />
      </form>
    </div>
  );
}
