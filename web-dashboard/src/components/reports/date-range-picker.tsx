import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DateRange } from '@/lib/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths } from 'date-fns';
import { sk } from 'date-fns/locale';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const presets = [
  {
    label: 'Dnes',
    getValue: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: 'Včera',
    getValue: () => {
      const yesterday = subDays(new Date(), 1);
      return {
        from: yesterday,
        to: yesterday,
      };
    },
  },
  {
    label: 'Tento týždeň',
    getValue: () => ({
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  {
    label: 'Tento mesiac',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Minulý mesiac',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    label: 'Posledných 30 dní',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = (preset: typeof presets[0]) => {
    onChange(preset.getValue());
    setIsOpen(false);
  };

  const handleCustomDateChange = (field: 'from' | 'to', date: string) => {
    const newDate = new Date(date);
    onChange({
      ...value,
      [field]: newDate,
    });
  };

  const formatDateRange = () => {
    if (!value.from || !value.to) return 'Vyberte dátum';
    
    if (value.from.toDateString() === value.to.toDateString()) {
      return format(value.from, 'dd.MM.yyyy', { locale: sk });
    }
    
    return `${format(value.from, 'dd.MM.yyyy', { locale: sk })} - ${format(value.to, 'dd.MM.yyyy', { locale: sk })}`;
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-64 justify-between"
      >
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          {formatDateRange()}
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 w-80 z-50 shadow-lg">
          <CardContent className="p-4">
            {/* Presets */}
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-700">Rýchly výber</h4>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-medium text-gray-700">Vlastný rozsah</h4>
              
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Od</label>
                  <input
                    type="date"
                    value={value.from ? format(value.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => handleCustomDateChange('from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Do</label>
                  <input
                    type="date"
                    value={value.to ? format(value.to, 'yyyy-MM-dd') : ''}
                    onChange={(e) => handleCustomDateChange('to', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Použiť
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
