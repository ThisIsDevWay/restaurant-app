import { EventCreateForm } from "../_components/EventCreateForm";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-10">
      <div className="space-y-1.5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-text-main tracking-tight font-display">
          Nuevo evento
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Crea un evento especial. Después podrás subir medios y asignarlo a las TVs vinculadas.
        </p>
      </div>
      <EventCreateForm />
    </div>
  );
}
