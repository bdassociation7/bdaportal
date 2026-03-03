import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  TIMEZONE_LIST,
  detectAndResolveTimezone,
  getTimezoneLabel,
  type TimezoneEntry,
} from '@/shared/constants/timezones';

interface TimezoneComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function TimezoneCombobox({ value, onValueChange, className }: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);

  // Build the full list, including the detected timezone if not already in the list
  const timezones = useMemo(() => {
    const detected = detectAndResolveTimezone();
    const exists = TIMEZONE_LIST.some(tz => tz.value === detected.value);
    if (exists) return TIMEZONE_LIST;
    // Add detected timezone at the top
    return [detected, ...TIMEZONE_LIST];
  }, []);

  const detectedTz = useMemo(() => detectAndResolveTimezone().value, []);

  const selectedLabel = getTimezoneLabel(value) || 'Select timezone...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{selectedLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by city, country, or timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {timezones.map((tz: TimezoneEntry) => (
                <CommandItem
                  key={tz.value}
                  value={`${tz.label} ${tz.searchTerms}`}
                  onSelect={() => {
                    onValueChange(tz.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === tz.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{tz.label}</span>
                  {tz.value === detectedTz && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      Detected
                    </span>
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
