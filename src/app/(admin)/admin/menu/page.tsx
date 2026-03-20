import { getMenuWithOptions } from "@/db/queries/menu";
import Link from "next/link";
import { Plus, Pencil, UtensilsCrossed, Image as ImageIcon } from "lucide-react";
import { formatRef } from "@/lib/money";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function MenuAdminPage() {
  const items = await getMenuWithOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Menú</h1>
          <p className="text-sm text-text-muted">{items.length} items en el menú</p>
        </div>
        <Link href="/admin/menu/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo item
          </Button>
        </Link>
      </div>

      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <UtensilsCrossed className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-sm font-medium text-text-main">Menú vacío</p>
              <p className="text-xs text-text-muted mt-1 max-w-[280px]">
                Agrega tu primer plato para comenzar a recibir pedidos
              </p>
              <Link href="/admin/menu/new" className="mt-4">
                <Button size="sm" className="gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Agregar item
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-app/50">
                  <TableHead className="font-semibold text-text-main pl-5">
                    Item
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Categoría
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Precio
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Estado
                  </TableHead>
                  <TableHead className="font-semibold text-text-main text-right pr-5">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-app ring-1 ring-border">
                            <ImageIcon className="h-4 w-4 text-text-muted" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-text-main block">
                            {item.name}
                          </span>
                          {item.description && (
                            <span className="text-xs text-text-muted line-clamp-1 max-w-[200px]">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.categoryName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-price-green">
                        {formatRef(item.priceUsdCents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.isAvailable
                            ? "bg-success/10 text-success border-transparent"
                            : "bg-error/10 text-error border-transparent"
                        }
                      >
                        {item.isAvailable ? "Disponible" : "Agotado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <Link href={`/admin/menu/${item.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-text-muted hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
