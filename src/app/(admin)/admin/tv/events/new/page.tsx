import { EventCreateForm } from "../_components/EventCreateForm";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Nuevo evento</h1>
        <p className="text-sm text-text-muted">
          Crea un evento. Después podrás subir medios y asignarlo a las TVs.
        </p>
      </div>
      <EventCreateForm />
    </div>
  );
}
