import ModulePage from "../../components/common/ModulePage.jsx";
import { FileDown } from "lucide-react";

const ExportTransactions = () => (
  <ModulePage
    title="Export transactions"
    description="Export eligible transaction records in a supported format."
    icon={FileDown}
  />
);

export default ExportTransactions;
