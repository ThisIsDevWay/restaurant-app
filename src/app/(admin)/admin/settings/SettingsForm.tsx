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
    <div className="relative pb-28">
      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={cn(
            "rounded-xl p-4 text-sm font-semibold animate-in fade-in slide-in-from-top-2 mb-6 shadow-sm",
            message.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
          )}>
            {message.text}
          </div>
        )}
 
        <Tabs defaultValue="general" className="w-full flex flex-col gap-0">
          <TabsList className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-2xl w-full overflow-x-auto whitespace-nowrap no-scrollbar snap-x mb-8 border border-border/10">
            <TabsTrigger 
              value="general" 
              className="flex-1 min-w-[105px] md:min-w-0 rounded-xl py-3 px-3 transition-all data-active:bg-white data-active:text-primary data-active:shadow-md flex items-center justify-center gap-2 select-none snap-center"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">General</span>
            </TabsTrigger>
            <TabsTrigger 
              value="design" 
              className="flex-1 min-w-[105px] md:min-w-0 rounded-xl py-3 px-3 transition-all data-active:bg-white data-active:text-primary data-active:shadow-md flex items-center justify-center gap-2 select-none snap-center"
            >
              <ListFilter className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">Diseño</span>
            </TabsTrigger>
            <TabsTrigger 
              value="operation" 
              className="flex-1 min-w-[105px] md:min-w-0 rounded-xl py-3 px-3 transition-all data-active:bg-white data-active:text-primary data-active:shadow-md flex items-center justify-center gap-2 select-none snap-center"
            >
              <Package className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">Operación</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="flex-1 min-w-[105px] md:min-w-0 rounded-xl py-3 px-3 transition-all data-active:bg-white data-active:text-primary data-active:shadow-md flex items-center justify-center gap-2 select-none snap-center"
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">Pagos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="messaging" 
              className="flex-1 min-w-[105px] md:min-w-0 rounded-xl py-3 px-3 transition-all data-active:bg-white data-active:text-primary data-active:shadow-md flex items-center justify-center gap-2 select-none snap-center"
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              <span className="text-xs md:text-sm">Mensajería</span>
            </TabsTrigger>
          </TabsList>
 
          <TabsContent value="design" className="outline-none">
            <SettingsDesignTab form={form} updateField={updateField} errors={errors} />
          </TabsContent>
 
          <TabsContent value="general" className="outline-none">
            <SettingsGeneralTab form={form} updateField={updateField} errors={errors} />
          </TabsContent>
 
          <TabsContent value="operation" className="outline-none">
            <SettingsOperationTab
              form={form}
              updateField={updateField}
              errors={errors}
              decimalInputs={decimalInputs}
              setDecimalInputs={setDecimalInputs}
            />
          </TabsContent>
 
          <TabsContent value="payments" className="outline-none">
            <SettingsPaymentsTab form={form} updateField={updateField} />
          </TabsContent>
 
          <TabsContent value="messaging" className="outline-none">
            <SettingsMessagingTab form={form} updateField={updateField} templates={templates} />
          </TabsContent>
        </Tabs>
 
        <SettingsSaveBar isSaving={isSaving} onDiscard={() => window.location.reload()} />
      </form>
    </div>
  );
}

