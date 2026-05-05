import { PageHeader } from "@/components/admin/PageHeader";
import { MachineForm } from "@/components/admin/MachineForm";

export const metadata = { title: "New machine" };

export default function NewMachinePage() {
  return (
    <div>
      <PageHeader title="New machine" backHref="/admin/machines" />
      <MachineForm
        initial={{
          slug: "",
          label: "",
          description: null,
          image: null,
        }}
      />
    </div>
  );
}
