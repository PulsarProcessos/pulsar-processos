import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxOption = { value: string; label: string; hint?: string };

type Props = {
  options: ComboboxOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
};

export function Combobox({
  options, value, onChange,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  disabled, clearable = true, className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !current && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{current ? current.label : placeholder}</span>
          <div className="flex items-center gap-1 shrink-0">
            {clearable && current && !disabled && (
              <X
                className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
              />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.hint ?? ""}`}
                  onSelect={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="ml-auto text-xs text-muted-foreground">{opt.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
