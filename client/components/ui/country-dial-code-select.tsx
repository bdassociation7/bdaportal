import { useState } from 'react';
import { Check, ChevronsUpDown, Globe2 } from 'lucide-react';
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
import { COUNTRY_OPTIONS, getCountryOption } from '@/constants/countries';
import { cn } from '@/lib/utils';

interface CountryDialCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
}

/**
 * A keyboard-accessible country selector that stores an ISO alpha-2 country code
 * while displaying the country name and its international telephone dial code.
 */
export function CountryDialCodeSelect({
  value,
  onValueChange,
  id,
  disabled = false,
  className,
  placeholder = 'Select a country',
  searchPlaceholder = 'Search by country, ISO code, or dial code...',
  emptyText = 'No country found.',
  ariaLabel = 'Country and dial code',
}: CountryDialCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedCountry = getCountryOption(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between bg-background px-3 font-normal hover:bg-background',
            !selectedCountry && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Globe2 className="h-4 w-4 shrink-0 text-[#0f91e0]" />
            {selectedCountry ? (
              <span className="truncate">
                {selectedCountry.name} <span className="text-muted-foreground">({selectedCountry.dialCode})</span>
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {COUNTRY_OPTIONS.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code} ${country.dialCode} ${country.dialCode.replace('+', '')}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                  className="min-h-10 gap-2 py-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-[#0f91e0]',
                      value === country.code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{country.name}</span>
                  <span className="shrink-0 text-muted-foreground">{country.dialCode}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
