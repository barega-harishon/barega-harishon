import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

interface FormFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  error?: string;
  required?: boolean;
}

export function FormField({
  id,
  label,
  placeholder,
  type = "text",
  error,
  required = false,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
