"use client";

import { CLADDING_SWATCH_OPTIONS } from "@/lib/inquiry/cladding-options";

interface CladdingSwatchGroupProps {
  title: string;
  value: string;
  onChange: (next: string) => void;
}

export function CladdingSwatchGroup({ title, value, onChange }: CladdingSwatchGroupProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{title}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CLADDING_SWATCH_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col items-center rounded-[var(--radius)] border p-3 text-center transition ${
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <input
                checked={selected}
                className="sr-only"
                onChange={() => onChange(opt.value)}
                type="radio"
                value={opt.value}
              />
              <span
                aria-hidden="true"
                className="mb-2 h-10 w-10 rounded-full border border-black/15 shadow-sm"
                style={{ backgroundColor: opt.hex }}
              />
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.code}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
