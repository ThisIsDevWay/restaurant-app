import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  CalendarDays,
  BookOpen,
  Tags,
  Table2,
  Tv,
  HandPlatter,
  ChefHat,
  Settings,
  ShieldCheck,
  UserCog,
  Wallet,
  Printer,
  MessageCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Documentación · Panel Admin",
};

type Section = {
  id: string;
  title: string;
};

const tocAdmin: Section[] = [
  { id: "dashboard", title: "Dashboard" },
  { id: "ordenes", title: "Órdenes" },
  { id: "menu-del-dia", title: "Menú del Día" },
  { id: "catalogo", title: "Catálogo" },
  { id: "categorias", title: "Categorías" },
  { id: "mesas", title: "Mesas" },
  { id: "tv", title: "Smart TVs" },
  { id: "configuracion", title: "Configuración" },
];

const tocStaff: Section[] = [
  { id: "waiter-overview", title: "Toma de Pedido (Mesero/Cajera)" },
  { id: "waiter-flujo", title: "Flujo de creación de orden" },
  { id: "waiter-pagos", title: "Cobro y métodos de pago" },
  { id: "waiter-mesas", title: "Manejo de mesas" },
  { id: "kitchen", title: "Pantalla de Cocina (KDS)" },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-2 lg:px-4 py-4 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full">Guía de uso</Badge>
          <Badge variant="outline" className="rounded-full">v1 — MVP</Badge>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-main">
          Documentación del Panel
        </h1>
        <p className="text-text-muted max-w-3xl">
          Guía detallada para los usuarios <strong>Administrador</strong> y{" "}
          <strong>Mesero/Cajera</strong>. Explica módulo por módulo qué hace
          cada sección, qué acciones están disponibles y cómo se conectan los
          flujos entre cocina, salón y caja.
        </p>
      </header>

      {/* Quick role summary */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Rol: Administrador
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted space-y-2">
            <p>
              Acceso completo al panel. Gestiona catálogo, menú del día,
              precios, costos, mesas, pantallas TV, usuarios y configuración
              global (impuestos, recargos, métodos de pago, impresoras).
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Crear/editar/archivar platos y categorías</li>
              <li>Publicar el menú del día</li>
              <li>Ver KPIs, márgenes y rentabilidad</li>
              <li>Configurar el restaurante y los integradores</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-5 w-5 text-amber-600" />
              Rol: Mesero / Cajera
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted space-y-2">
            <p>
              Acceso operativo. Toma pedidos, asigna mesas, cobra y cierra
              órdenes. <strong>No</strong> puede modificar precios, costos ni
              configuración del restaurante.
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Crear órdenes (mesa, para llevar, delivery)</li>
              <li>Marcar 86 (agotado) sobre platos del menú del día</li>
              <li>Procesar pagos en Bs, USD, Pago Móvil y transferencias</li>
              <li>Imprimir ticket y comanda a cocina</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* TOC */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contenido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
          <div>
            <p className="font-medium text-text-main mb-2">Administrador</p>
            <ul className="space-y-1">
              {tocAdmin.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-primary hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-text-main mb-2">
              Mesero / Cajera / Cocina
            </p>
            <ul className="space-y-1">
              {tocStaff.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-primary hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ============ ADMIN ============ */}
      <h2 className="text-xl font-bold text-text-main pt-4 border-b border-border pb-2">
        Panel de Administración
      </h2>

      <DocSection
        id="dashboard"
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Dashboard"
        route="/admin"
      >
        <p>
          Vista de inicio con los <strong>KPIs del día</strong>: ventas totales,
          órdenes completadas, ticket promedio, margen ponderado y comparativa
          contra el día anterior. Incluye:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Gráfico de órdenes</strong> por hora del día actual.
          </li>
          <li>
            <strong>Top de platos</strong> más vendidos hoy.
          </li>
          <li>
            <strong>Órdenes recientes</strong> con su estado (PENDING, PREPARING,
            READY, COMPLETED, CANCELLED).
          </li>
          <li>
            <strong>Alertas de costos desactualizados</strong>: platos cuyo
            costo no se revisa desde hace más de 30 días.
          </li>
        </ul>
        <Callout type="info">
          Las cifras se calculan en zona horaria <code>America/Caracas</code>.
          Un &quot;día&quot; va desde las 00:00 hasta las 23:59 de Caracas.
        </Callout>
      </DocSection>

      <DocSection
        id="ordenes"
        icon={<ShoppingBag className="h-5 w-5" />}
        title="Órdenes"
        route="/admin/orders"
      >
        <p>
          Listado central de <strong>todas las órdenes</strong> sin importar
          el origen (salón, para llevar, delivery, web). Permite:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Filtrar por estado, modo (DINE_IN, TAKEAWAY, DELIVERY) y fecha.</li>
          <li>Abrir el detalle para ver ítems, pagos, totales y bitácora.</li>
          <li>
            <strong>Cambiar el estado</strong> manualmente cuando es necesario
            (por ejemplo, cancelar o marcar como pagado).
          </li>
          <li>Reimprimir el ticket o la comanda de cocina.</li>
        </ul>
        <h4 className="font-medium text-text-main mt-3">Estados de una orden</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>PENDING</strong>: creada, esperando confirmación/pago.</li>
          <li><strong>PREPARING</strong>: cocina la está preparando.</li>
          <li><strong>READY</strong>: lista para entregar/servir.</li>
          <li><strong>COMPLETED</strong>: entregada y pagada.</li>
          <li><strong>CANCELLED</strong>: anulada (no afecta KPIs de ventas).</li>
        </ul>
      </DocSection>

      <DocSection
        id="menu-del-dia"
        icon={<CalendarDays className="h-5 w-5" />}
        title="Menú del Día"
        route="/admin/menu-del-dia"
      >
        <p>
          Define qué platos del catálogo están <strong>disponibles hoy</strong>{" "}
          y a qué precio. Es lo que ve el mesero al tomar el pedido y lo que
          se publica al menú público.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Activar/desactivar</strong> platos del catálogo para la
            fecha seleccionada.
          </li>
          <li>
            Ajustar el <strong>precio del día</strong> sin tocar el precio
            base del catálogo.
          </li>
          <li>
            Agrupar por <strong>categorías</strong> (entradas, principales,
            bebidas, contornos, adicionales).
          </li>
          <li>
            Marcar como <strong>86 (agotado)</strong> durante el servicio.
          </li>
        </ul>
        <Callout type="warning">
          Si un plato no está en el menú del día, <strong>no aparecerá</strong>{" "}
          en la pantalla de toma de pedido del mesero, aunque exista en el
          catálogo.
        </Callout>
      </DocSection>

      <DocSection
        id="catalogo"
        icon={<BookOpen className="h-5 w-5" />}
        title="Catálogo"
        route="/admin/catalogo"
      >
        <p>
          Maestro de todos los platos, bebidas, contornos y adicionales que
          alguna vez puede vender el restaurante. Aquí se administra:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Crear/editar</strong> ítem: nombre, descripción, foto,
            categoría, precio base, costo, IVA aplicable.
          </li>
          <li>
            <strong>Variantes</strong> del ítem (ej.: tamaños, presentaciones).
          </li>
          <li>
            <strong>Adicionales / contornos / bebidas</strong> ligados al ítem.
          </li>
          <li>
            <strong>Costo</strong> y margen calculado automáticamente sobre el
            precio del día.
          </li>
          <li>
            <strong>Archivar</strong> (soft-delete) cuando ya no se vende.
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="categorias"
        icon={<Tags className="h-5 w-5" />}
        title="Categorías"
        route="/admin/categories"
      >
        <p>
          Organiza visualmente el catálogo y el menú del día. Permite crear,
          renombrar, reordenar (drag &amp; drop) y archivar categorías. El
          orden definido aquí es el orden con el que aparecen en la app del
          mesero y en el menú público.
        </p>
      </DocSection>

      <DocSection
        id="mesas"
        icon={<Table2 className="h-5 w-5" />}
        title="Mesas"
        route="/admin/tables"
      >
        <p>
          Configura el salón: cantidad de mesas, nombre/número y capacidad.
          Estas mesas son las que el mesero asigna al crear una orden{" "}
          <strong>DINE_IN</strong>.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Agregar / eliminar / renombrar mesas.</li>
          <li>
            Ver en tiempo real qué mesas están <strong>ocupadas</strong>{" "}
            (tienen orden abierta) y cuáles están libres.
          </li>
          <li>Fusionar/dividir cuentas (si aplica).</li>
        </ul>
      </DocSection>

      <DocSection
        id="tv"
        icon={<Tv className="h-5 w-5" />}
        title="Smart TVs"
        route="/admin/tv"
      >
        <p>
          Gestiona las pantallas del local (menú visual, eventos, promociones).
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Displays</strong>: emparejar TVs con un código de
            activación.
          </li>
          <li>
            <strong>Eventos</strong>: programar contenido por horario (ej.:
            menú del almuerzo de 12:00 a 16:00).
          </li>
          <li>
            <strong>Media library</strong>: subir imágenes/videos para usar en
            los displays.
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="configuracion"
        icon={<Settings className="h-5 w-5" />}
        title="Configuración"
        route="/admin/settings"
      >
        <p>
          Ajustes globales que afectan toda la operación. Sólo accesible para
          el rol Administrador.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Datos del restaurante</strong>: nombre, logo, RIF, dirección,
            teléfono.
          </li>
          <li>
            <strong>Tasa BCV</strong> y moneda de referencia (Bs / USD).
          </li>
          <li>
            <strong>Impuestos y recargos</strong> (IVA, recargo por tarjeta,
            servicio).
          </li>
          <li>
            <strong>Métodos de pago</strong>: activar Pago Móvil, Zelle,
            transferencias, efectivo Bs/USD.
          </li>
          <li>
            <strong>Impresoras</strong>: configurar el agente de impresión
            térmica.
          </li>
          <li>
            <strong>WhatsApp</strong>: vincular sesión WA-Web para
            notificaciones de pedidos a clientes.
          </li>
        </ul>
        <Callout type="warning">
          Cambios aquí son inmediatos. Antes de modificar IVA o recargos
          asegúrate de que no haya órdenes abiertas en caja.
        </Callout>
      </DocSection>

      {/* ============ STAFF ============ */}
      <h2 className="text-xl font-bold text-text-main pt-6 border-b border-border pb-2">
        Personal de Salón y Cocina
      </h2>

      <DocSection
        id="waiter-overview"
        icon={<HandPlatter className="h-5 w-5" />}
        title="Toma de Pedido (Mesero / Cajera)"
        route="/waiter"
      >
        <p>
          Interfaz optimizada para tablet. Es la pantalla principal del personal
          de salón y caja. Muestra únicamente lo que está en el{" "}
          <strong>menú del día</strong> y no permite editar precios.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Vista de categorías + grilla de platos disponibles.</li>
          <li>Carrito lateral con la orden en construcción.</li>
          <li>Botón de cobro que abre el modal de pago.</li>
          <li>Indicadores visuales si un plato está marcado como 86.</li>
        </ul>
      </DocSection>

      <DocSection
        id="waiter-flujo"
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Flujo de creación de orden"
      >
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Elegir <strong>modo</strong>: en sitio (mesa), para llevar o
            delivery.
          </li>
          <li>
            Si es <strong>en sitio</strong>: seleccionar la mesa.
          </li>
          <li>
            Añadir ítems al carrito. Tocar un ítem con adicionales/variantes
            abre el modal de personalización.
          </li>
          <li>
            Revisar el resumen (subtotal, IVA, recargos, total en Bs y USD).
          </li>
          <li>
            Pulsar <strong>Enviar a cocina</strong> — la orden pasa a estado
            PREPARING y se imprime la comanda automáticamente.
          </li>
          <li>
            Cuando el cliente pide la cuenta: pulsar <strong>Cobrar</strong>,
            registrar pago y cerrar como COMPLETED.
          </li>
        </ol>
        <Callout type="info">
          Las órdenes se pueden <strong>guardar abiertas</strong> en la mesa y
          se pueden agregar más ítems en cualquier momento antes del cobro.
        </Callout>
      </DocSection>

      <DocSection
        id="waiter-pagos"
        icon={<Wallet className="h-5 w-5" />}
        title="Cobro y métodos de pago"
      >
        <p>
          El modal de cobro soporta <strong>pagos divididos</strong> (varios
          métodos en una misma orden):
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Efectivo Bs</strong> — calcula vuelto automáticamente.
          </li>
          <li>
            <strong>Efectivo USD</strong> — conversión por tasa BCV configurada.
          </li>
          <li>
            <strong>Pago Móvil</strong> — capturar referencia (últimos 4 dígitos
            del banco + monto).
          </li>
          <li>
            <strong>Transferencia / Zelle</strong> — referencia obligatoria.
          </li>
          <li>
            <strong>Tarjeta / POS</strong> — si está activada, aplica recargo
            configurado.
          </li>
        </ul>
        <p>
          Al confirmar el pago, la orden se cierra, se imprime el ticket y, si
          está configurado, se envía notificación por WhatsApp al cliente.
        </p>
        <Callout type="warning">
          Verifica siempre la <strong>referencia</strong> del pago móvil/
          transferencia antes de cerrar. Una vez COMPLETED, sólo el
          administrador puede revertir el cobro.
        </Callout>
      </DocSection>

      <DocSection
        id="waiter-mesas"
        icon={<Table2 className="h-5 w-5" />}
        title="Manejo de mesas"
      >
        <ul className="list-disc list-inside space-y-1">
          <li>
            Una mesa puede tener <strong>una sola orden abierta</strong> a la
            vez.
          </li>
          <li>
            Al cobrar y cerrar la orden, la mesa queda automáticamente{" "}
            <strong>libre</strong>.
          </li>
          <li>
            Para mover una orden de mesa: abrir la orden y usar &quot;Cambiar
            mesa&quot;.
          </li>
        </ul>
      </DocSection>

      <DocSection
        id="kitchen"
        icon={<ChefHat className="h-5 w-5" />}
        title="Pantalla de Cocina (KDS)"
        route="/kitchen"
      >
        <p>
          Pantalla pensada para una TV o monitor en cocina. Muestra todas las
          órdenes en estado PREPARING en formato de tarjetas/columnas.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Cada tarjeta indica mesa, modo, hora de entrada y items.</li>
          <li>
            Cocina marca cada plato como listo; al completar todos los items la
            orden pasa a <strong>READY</strong>.
          </li>
          <li>
            Indicador de <strong>tiempo transcurrido</strong> (verde &lt; 10
            min, amarillo &lt; 20 min, rojo &gt; 20 min).
          </li>
          <li>
            Se actualiza en tiempo real sin recargar (polling cada pocos
            segundos).
          </li>
        </ul>
      </DocSection>

      {/* Integrations */}
      <h2 className="text-xl font-bold text-text-main pt-6 border-b border-border pb-2">
        Integraciones
      </h2>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Printer className="h-5 w-5 text-text-muted" />
              Impresión térmica
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted space-y-2">
            <p>
              Un agente local (servicio Go) corre en el equipo conectado a la
              impresora. Recibe los trabajos del servidor y los imprime en la
              impresora térmica. Se configura desde <em>Configuración →
              Impresoras</em>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-text-muted" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-text-muted space-y-2">
            <p>
              Vincula una sesión de WhatsApp-Web para enviar al cliente la
              confirmación de su pedido, estado y ticket. Se gestiona desde{" "}
              <em>Configuración → WhatsApp</em>.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-border">
        <p className="text-xs text-text-muted">
          ¿Falta algo en esta guía? Avísale al administrador para que actualice
          esta página. Última revisión basada en el MVP actual del sistema.
        </p>
        <div className="mt-2">
          <Link
            href="/admin"
            className="text-sm text-primary hover:underline"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}

function DocSection({
  id,
  icon,
  title,
  route,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  route?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-primary">{icon}</span>
            {title}
          </CardTitle>
          {route && (
            <Link
              href={route}
              className="text-xs font-mono text-primary hover:underline"
            >
              {route}
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm text-text-muted space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    type === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-blue-200 bg-blue-50 text-blue-900";
  const Icon = type === "warning" ? AlertTriangle : Info;
  return (
    <div
      className={`mt-2 flex gap-2 rounded-lg border px-3 py-2 text-sm ${styles}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
