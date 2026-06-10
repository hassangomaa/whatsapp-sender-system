'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

type Props = {
  value: string;
  onChange: (e164Digits: string, display: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

const COUNTRIES = getCountries().map((code) => ({
  code,
  dial: `+${getCountryCallingCode(code)}`,
  name: new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code,
}));

export function PhoneInput({ value, onChange, label = 'Phone number', required, disabled }: Props) {
  const [country, setCountry] = useState('EG');
  const [local, setLocal] = useState('');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRIES.slice(0, 30);
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    ).slice(0, 30);
  }, [search]);

  const selected = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];

  function emit(nextCountry: string, nextLocal: string) {
    const dial = getCountryCallingCode(nextCountry as Parameters<typeof getCountryCallingCode>[0]);
    const raw = `+${dial}${nextLocal.replace(/\D/g, '')}`;
    const parsed = parsePhoneNumberFromString(raw);
    const digits = parsed?.isValid() ? parsed.format('E.164').replace(/\D/g, '') : nextLocal.replace(/\D/g, '');
    onChange(digits, raw);
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="input-field flex items-center gap-1 min-w-[110px] justify-between"
          >
            <span className="text-sm">{selected.code} {selected.dial}</span>
            <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 w-64 card p-2 shadow-lg max-h-64 overflow-hidden flex flex-col">
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-[var(--muted)]" />
                <input
                  className="input-field pl-8 text-sm"
                  placeholder="Search country"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    className="w-full text-left px-2 py-2 rounded-lg text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    onClick={() => {
                      setCountry(c.code);
                      setOpen(false);
                      setSearch('');
                      emit(c.code, local);
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[var(--muted)] ml-2">{c.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <input
          type="tel"
          required={required}
          disabled={disabled}
          className="input-field flex-1"
          placeholder="1234567890"
          value={local || value.replace(selected.dial.replace('+', ''), '')}
          onChange={(e) => {
            const v = e.target.value;
            setLocal(v);
            emit(country, v);
          }}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">Digits with country code. Example: 201234567890</p>
    </label>
  );
}
