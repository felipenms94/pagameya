"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PriorityBadge } from "./priority-badge"
import { TagBadge } from "./tag-badge"
import { Eye, Pencil, Trash2, Star } from "lucide-react"
import type { Person } from "@/lib/types"

type PersonsTableProps = {
  persons: Person[]
  isLoading?: boolean
  onEdit?: (person: Person) => void
  onDelete?: (person: Person) => void
}

function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-8 w-24 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PersonsTable({
  persons,
  isLoading,
  onEdit,
  onDelete,
}: PersonsTableProps) {
  if (isLoading) {
    return <TableSkeleton />
  }

  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No hay personas registradas
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Crea una nueva persona para empezar.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {persons.map((person) => (
          <TableRow key={person.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {person.isFavorite && (
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                )}
                <div>
                  <Link
                    href={`/app/personas/${person.id}`}
                    className="font-medium hover:underline"
                  >
                    {person.name}
                  </Link>
                  {person.email && (
                    <p className="text-xs text-muted-foreground">{person.email}</p>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              {person.phone || (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <PriorityBadge priority={person.priority} />
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {person.tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sin tags</span>
                ) : (
                  person.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} size="sm" />
                  ))
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/app/personas/${person.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(person)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(person)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
