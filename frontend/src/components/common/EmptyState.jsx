import {
  FileText,
  Plus,
} from "lucide-react";

import Button from "./Button.jsx";

const EmptyState = ({
  icon: Icon = FileText,
  title = "Nothing here yet",
  description = "There is currently no information available.",
  action,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon className="h-6 w-6" />
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>

        {action && (
          <Button
            className="mt-5"
            variant={
              action.variant || "primary"
            }
            onClick={action.onClick}
            leftIcon={
              action.icon ? (
                <action.icon className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )
            }
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;