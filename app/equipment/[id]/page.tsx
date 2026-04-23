import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightCircle } from "lucide-react";

import { listEquipmentBatchAvailability } from "@/actions/equipment-batches";
import { getEquipmentRowById } from "@/actions/equipment-catalog";
import { EquipmentBatchesPanel } from "@/components/equipment/equipment-batches-panel";
import { DeleteEquipmentButton } from "@/components/equipment/delete-equipment-button";
import { EditEquipmentForm } from "@/components/equipment/edit-equipment-form";
import { Button } from "@/components/ui/button";
import { getCurrentAppRoles } from "@/lib/auth/current-profile";

export const dynamic = "force-dynamic";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [equipment, roles] = await Promise.all([getEquipmentRowById(id), getCurrentAppRoles()]);

  if (!equipment) {
    notFound();
  }

  const batches = await listEquipmentBatchAvailability(equipment.id);
  const showDelete = roles.includes("admin");

  return (
    <main className="container-page py-8">
      <div className="page-header-row mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">עריכת ציוד</h1>
        <Button asChild variant="outline">
          <Link className="inline-flex items-center gap-1.5" href="/equipment">
            <ArrowRightCircle className="h-4 w-4" />
            חזרה למלאי
          </Link>
        </Button>
      </div>
      <div className="max-w-2xl space-y-8">
        <EditEquipmentForm equipment={equipment} />
        <EquipmentBatchesPanel batches={batches} equipmentId={equipment.id} />
        {showDelete ? (
          <DeleteEquipmentButton equipmentId={equipment.id} equipmentName={equipment.name} />
        ) : null}
      </div>
    </main>
  );
}
