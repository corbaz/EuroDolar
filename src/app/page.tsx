
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { format, parse, isValid, startOfMonth, subDays, isWeekend, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Euro, RefreshCw, Info, History, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UsdQuote {
  compra: number | null;
  venta: number | null;
}

export interface CurrencyData {
  USD_BLUE: UsdQuote | null;
  USD_OFICIAL: UsdQuote | null;
  EUR: UsdQuote | null;
  quoteDate: string | null; // YYYY-MM-DD for which all quotes are fetched
}

interface ModalContent {
  title: string;
  description: ReactNode;
}

type CurrencyLabelKey = 'usdBlueLabel' | 'usdOficialLabel' | 'eurLabel';

interface HistoricalRateEntry {
  id: string; // e.g., "2024-07-18-USD_BLUE"
  date: string; // ISO string "YYYY-MM-DD"
  currencyLabelKey: CurrencyLabelKey;
  buy: number | null;
  sell: number | null;
}

const MIN_DATE = new Date("2000-01-01");
const MIN_CALENDAR_MONTH = startOfMonth(MIN_DATE);
const currencyOrder: Record<CurrencyLabelKey, number> = { 'usdBlueLabel': 1, 'usdOficialLabel': 2, 'eurLabel': 3 };


export default function PesoWatcherPage() {
  const { t, dateLocale } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [currencyData, setCurrencyData] = useState<CurrencyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const { toast } = useToast();

  const [flatHistoricalRates, setFlatHistoricalRates] = useState<HistoricalRateEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'currencyLabelKey'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });


  const fetchCurrencyData = useCallback(async () => {
    if (!selectedDate || !isValid(selectedDate)) {
      toast({
        title: t('toastNoValidDateTitle'),
        description: t('toastNoValidDateDescription'),
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setCurrencyData(null); 

      const formattedDateForStorage = format(selectedDate, 'yyyy-MM-dd');
      const formattedDateForPath = format(selectedDate, 'yyyy/MM/dd');
      
      let usdBlueValues: UsdQuote | null = null;
      let usdOficialValues: UsdQuote | null = null;
      let eurValues: UsdQuote | null = null;
      const errors: string[] = [];

      // Fetch USD Blue data
      try {
        const usdBlueResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/${formattedDateForPath}`);
        if (usdBlueResponse.ok) {
          const data = await usdBlueResponse.json();
          if (data && typeof data.compra === 'number' && typeof data.venta === 'number') {
            usdBlueValues = { compra: data.compra, venta: data.venta };
          } else {
             errors.push(t('noExchangeRateDataSpecific', { currency: t('usdBlueLabel'), date: format(selectedDate, 'P', { locale: dateLocale }) }));
          }
        } else {
          let errorMsg = `USD (Blue) API (${format(selectedDate, 'P', { locale: dateLocale })}): ${usdBlueResponse.status} ${usdBlueResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await usdBlueResponse.json(); if (errorJson.error) errorMsg = `USD (Blue) API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `USD (Blue) API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`USD (Blue) API Fetch Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${error.message || 'Network error'}`);
      }

      // Fetch USD Oficial data
      try {
        const usdOficialResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${formattedDateForPath}`);
        if (usdOficialResponse.ok) {
          const data = await usdOficialResponse.json();
          if (data && typeof data.compra === 'number' && typeof data.venta === 'number') {
            usdOficialValues = { compra: data.compra, venta: data.venta };
          } else {
            errors.push(t('noExchangeRateDataSpecific', { currency: t('usdOficialLabel'), date: format(selectedDate, 'P', { locale: dateLocale }) }));
          }
        } else {
          let errorMsg = `USD (Oficial) API (${format(selectedDate, 'P', { locale: dateLocale })}): ${usdOficialResponse.status} ${usdOficialResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await usdOficialResponse.json(); if (errorJson.error) errorMsg = `USD (Oficial) API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `USD (Oficial) API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`USD (Oficial) API Fetch Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${error.message || 'Network error'}`);
      }
      
      // Fetch EUR data
      try {
        const eurResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/eur/${formattedDateForPath}`);
        if (eurResponse.ok) {
          const data = await eurResponse.json();
           if (data && typeof data.compra === 'number' && typeof data.venta === 'number') {
            eurValues = { compra: data.compra, venta: data.venta };
          } else {
            errors.push(t('noExchangeRateDataSpecific', { currency: t('eurLabel'), date: format(selectedDate, 'P', { locale: dateLocale }) }));
          }
        } else {
          let errorMsg = `EUR API (${format(selectedDate, 'P', { locale: dateLocale })}): ${eurResponse.status} ${eurResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await eurResponse.json(); if (errorJson.error) errorMsg = `EUR API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `EUR API Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`EUR API Fetch Error (${format(selectedDate, 'P', { locale: dateLocale })}): ${error.message || 'Network error'}`);
      }
      
      if (errors.length > 0 && !usdBlueValues && !usdOficialValues && !eurValues) {
         toast({
          title: t('apiErrorsTitle'),
          description: (
              <div className="max-h-40 overflow-y-auto">
                  {errors.map((e, i) => <p key={i}>{t('apiErrorsDescriptionItem', { error: e })}</p>)}
              </div>
          ),
          variant: "destructive",
          duration: 5000,
        });
      }
      
      const newCurrencyData: CurrencyData = {
        USD_BLUE: usdBlueValues,
        USD_OFICIAL: usdOficialValues,
        EUR: eurValues,
        quoteDate: (usdBlueValues || usdOficialValues || eurValues) ? formattedDateForStorage : null,
      };
      setCurrencyData(newCurrencyData);

      const modalDialogTitle = t('modalTitle');
      const displayDate = newCurrencyData.quoteDate ? format(parse(newCurrencyData.quoteDate, 'yyyy-MM-dd', new Date()), 'PPP', { locale: dateLocale }) : (selectedDate ? format(selectedDate, 'PPP', { locale: dateLocale }) : t('selectedDateFallback'));
      
      const modalDescription = (
        <div className="space-y-4">
          {/* USD Blue */}
          {newCurrencyData.USD_BLUE && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <DollarSign className="w-5 h-5 mr-2 text-primary" /> 
                {t('usdBlueLabel')} {t('ratesForDateText', { date: displayDate })}:
              </p>
              {newCurrencyData.USD_BLUE.compra !== null && (
                <p className="ml-7 text-md">{t('compraShort')}: <span className="font-medium">{newCurrencyData.USD_BLUE.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.USD_BLUE.venta !== null && (
                <p className="ml-7 text-md">{t('ventaShort')}: <span className="font-medium">{newCurrencyData.USD_BLUE.venta.toFixed(2)} ARS</span></p>
              )}
               {(newCurrencyData.USD_BLUE.compra === null && newCurrencyData.USD_BLUE.venta === null) && (
                <p className="ml-7 text-sm text-muted-foreground">{t('dataNotAvailableOnDate', { currency: t('usdBlueLabel') })}</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-5 h-5 mr-2" /> {t('dataNotAvailableOnDate', { currency: t('usdBlueLabel') })}</p>}
          
          {/* USD Oficial */}
          {newCurrencyData.USD_OFICIAL && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <DollarSign className="w-5 h-5 mr-2 text-primary" /> 
                {t('usdOficialLabel')} {t('ratesForDateText', { date: displayDate })}:
              </p>
               {newCurrencyData.USD_OFICIAL.compra !== null && (
                <p className="ml-7 text-md">{t('compraShort')}: <span className="font-medium">{newCurrencyData.USD_OFICIAL.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.USD_OFICIAL.venta !== null && (
                <p className="ml-7 text-md">{t('ventaShort')}: <span className="font-medium">{newCurrencyData.USD_OFICIAL.venta.toFixed(2)} ARS</span></p>
              )}
              {(newCurrencyData.USD_OFICIAL.compra === null && newCurrencyData.USD_OFICIAL.venta === null) && (
                <p className="ml-7 text-sm text-muted-foreground">{t('dataNotAvailableOnDate', { currency: t('usdOficialLabel') })}</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-5 h-5 mr-2" /> {t('dataNotAvailableOnDate', { currency: t('usdOficialLabel') })}</p>}

          {/* EUR */}
          {newCurrencyData.EUR && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <Euro className="w-5 h-5 mr-2 text-primary" /> 
                {t('eurLabel')} {t('ratesForDateText', { date: displayDate })}:
              </p>
              {newCurrencyData.EUR.compra !== null && (
                <p className="ml-7 text-md">{t('compraShort')}: <span className="font-medium">{newCurrencyData.EUR.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.EUR.venta !== null && (
                <p className="ml-7 text-md">{t('ventaShort')}: <span className="font-medium">{newCurrencyData.EUR.venta.toFixed(2)} ARS</span></p>
              )}
              {(newCurrencyData.EUR.compra === null && newCurrencyData.EUR.venta === null) && (
                 <p className="ml-7 text-sm text-muted-foreground">{t('dataNotAvailableOnDate', { currency: t('eurLabel') })}</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><Euro className="w-5 h-5 mr-2" /> {t('dataNotAvailableOnDate', { currency: t('eurLabel') })}</p>}


          {errors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                  <p className="font-medium text-destructive text-sm">{t('apiErrorsTitle')}:</p>
                  <ul className="list-disc list-inside text-destructive text-xs max-h-20 overflow-y-auto">
                      {errors.map((e,i) => <li key={i}>{e}</li>)}
                  </ul>
              </div>
          )}
          {!newCurrencyData.USD_BLUE && !newCurrencyData.USD_OFICIAL && !newCurrencyData.EUR && errors.length === 0 && (
               <p className="text-destructive font-medium">{t('noExchangeRateDataGeneric', { date: displayDate })}</p>
          )}
        </div>
      );

      setModalContent({
        title: modalDialogTitle,
        description: modalDescription
      });
      setIsModalOpen(true);

    } catch (error: any) {
      console.error("Critical error in fetchCurrencyData:", error);
      setModalContent({
        title: t('criticalErrorTitle'),
        description: <p className="text-destructive font-medium">{error.message || "An unexpected critical error occurred."}</p>
      });
      setIsModalOpen(true);
      setCurrencyData({ USD_BLUE: null, USD_OFICIAL: null, EUR: null, quoteDate: null }); 
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, t, dateLocale]);

  useEffect(() => {
    if (selectedDate && isValid(selectedDate)) {
      fetchCurrencyData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]); 

  useEffect(() => {
    if (selectedDate && isValid(selectedDate)) {
      const newCalMonth = startOfMonth(selectedDate);
      if (calendarMonth.getTime() !== newCalMonth.getTime()) {
        setCalendarMonth(newCalMonth);
      }
    }
  }, [selectedDate, calendarMonth]);


  const currentYr = new Date().getFullYear();
  const years = Array.from({ length: currentYr - MIN_DATE.getFullYear() + 1 }, (_, i) => currentYr - i);

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr);
    const currentDisplayMonth = calendarMonth.getMonth(); 
    
    let newCalendarFocusDate = startOfMonth(new Date(newYear, currentDisplayMonth, 1));
    const todayMonthStart = startOfMonth(new Date());
    
    if (newCalendarFocusDate > todayMonthStart) {
        newCalendarFocusDate = todayMonthStart; 
        toast({ title: t('toastInvalidYearTitle'), description: t('toastInvalidYearDescriptionFuture'), variant: "destructive", duration: 3000 });
    } else if (newCalendarFocusDate < MIN_CALENDAR_MONTH) {
        newCalendarFocusDate = MIN_CALENDAR_MONTH; 
        toast({ title: t('toastInvalidYearTitle'), description: t('toastInvalidYearDescriptionPast', { year: format(MIN_DATE, 'yyyy') }), variant: "destructive", duration: 3000 });
    }
    setCalendarMonth(newCalendarFocusDate);
  };

  const handleMonthChange = (monthStr: string) => {
    const newMonth = parseInt(monthStr);
    const currentDisplayYear = calendarMonth.getFullYear();

    let newCalendarFocusDate = startOfMonth(new Date(currentDisplayYear, newMonth, 1));
    const todayMonthStart = startOfMonth(new Date());
        
    if (newCalendarFocusDate > todayMonthStart) {
        newCalendarFocusDate = todayMonthStart;
        toast({ title: t('toastInvalidMonthTitle'), description: t('toastInvalidMonthDescriptionFuture'), variant: "destructive", duration: 3000 });
    } else if (newCalendarFocusDate < MIN_CALENDAR_MONTH) {
        newCalendarFocusDate = MIN_CALENDAR_MONTH;
        toast({ title: t('toastInvalidMonthTitle'), description: t('toastInvalidMonthDescriptionPast', { monthYear: format(MIN_DATE, 'MMMM yyyy', { locale: dateLocale }) }), variant: "destructive", duration: 3000 });
    }
    setCalendarMonth(newCalendarFocusDate);
  };

  const handleCalendarDaySelect = (date: Date | undefined) => {
    if (date) {
      if (date > new Date()) {
        toast({ title: t('toastInvalidDateTitle'), description: t('toastInvalidDateDescriptionFuture'), variant: "destructive", duration: 3000 });
        setSelectedDate(undefined); 
        setCurrencyData(null);
        return;
      }
      if (date < MIN_DATE) {
        toast({ title: t('toastInvalidDateTitle'), description: t('toastInvalidDateDescriptionPast', { date: format(MIN_DATE, 'P', { locale: dateLocale }) }), variant: "destructive", duration: 3000 });
        setSelectedDate(undefined); 
        setCurrencyData(null);
        return;
      }
      setSelectedDate(date); 
    } else {
      setSelectedDate(undefined);
      setCurrencyData(null);
    }
  };

  const handleRefresh = () => {
    if (selectedDate && isValid(selectedDate)) {
        fetchCurrencyData(); 
    } else {
        toast({ title: t('toastRefreshDateNeededTitle'), description: t('toastRefreshDateNeededDescription'), variant: "default"});
    }
  };
  
  const displayDateInCard = currencyData?.quoteDate && selectedDate ? format(parse(currencyData.quoteDate, 'yyyy-MM-dd', selectedDate), 'PPP', { locale: dateLocale }) : (selectedDate ? format(selectedDate, 'PPP', { locale: dateLocale }) : t('selectedDateFallback'));
  
  const localizedMonths = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      value: i.toString(),
      label: format(new Date(2000, i, 1), 'MMMM', { locale: dateLocale }),
    })), [dateLocale]);

  const fetchHistoricalData = useCallback(async () => {
    setIsHistoryLoading(true);
    const historicalRates: HistoricalRateEntry[] = [];
    const today = new Date();
    let currentDate = subDays(today, 1); 
    const targetDays = 10;
    const fetchedDaysCount = 0;
    const attemptedDates: string[] = []; // To keep track of dates we attempt to fetch for.

    const currencyConfigs: {
      labelKey: CurrencyLabelKey;
      path: string;
    }[] = [
      { labelKey: 'usdBlueLabel', path: 'dolares/blue' },
      { labelKey: 'usdOficialLabel', path: 'dolares/oficial' },
      { labelKey: 'eurLabel', path: 'eur' },
    ];

    while (attemptedDates.length < targetDays && currentDate >= MIN_DATE) {
        if (!isWeekend(currentDate)) {
            attemptedDates.push(format(currentDate, 'yyyy-MM-dd')); // Track that we're attempting this day

            const datePath = format(currentDate, 'yyyy/MM/dd');
            const dateStr = format(currentDate, 'yyyy-MM-dd');

            for (const config of currencyConfigs) {
                try {
                    const response = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/${config.path}/${datePath}`);
                    if (response.ok) {
                        const data = await response.json();
                        historicalRates.push({
                            id: `${dateStr}-${config.labelKey}`,
                            date: dateStr,
                            currencyLabelKey: config.labelKey,
                            buy: typeof data.compra === 'number' ? data.compra : null,
                            sell: typeof data.venta === 'number' ? data.venta : null,
                        });
                    } else {
                        console.warn(`No data for ${config.labelKey} on ${dateStr}: ${response.status}`);
                        historicalRates.push({
                            id: `${dateStr}-${config.labelKey}`,
                            date: dateStr,
                            currencyLabelKey: config.labelKey,
                            buy: null,
                            sell: null,
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching historical ${config.labelKey} for ${dateStr}:`, error);
                    historicalRates.push({
                        id: `${dateStr}-${config.labelKey}`,
                        date: dateStr,
                        currencyLabelKey: config.labelKey,
                        buy: null,
                        sell: null,
                    });
                }
            }
        }
        currentDate = subDays(currentDate, 1);
    }
    
    historicalRates.sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return (currencyOrder[a.currencyLabelKey] || 99) - (currencyOrder[b.currencyLabelKey] || 99);
    });

    setFlatHistoricalRates(historicalRates);
    setIsHistoryLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]); 

  useEffect(() => {
    fetchHistoricalData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (columnKey: 'date' | 'currencyLabelKey') => {
    setSortConfig(currentSortConfig => {
      let newDirection: 'asc' | 'desc' = 'asc';
      if (currentSortConfig.key === columnKey) {
        newDirection = currentSortConfig.direction === 'asc' ? 'desc' : 'asc';
      } else {
        if (columnKey === 'date') newDirection = 'asc'; 
        else if (columnKey === 'currencyLabelKey') newDirection = 'asc'; 
      }
      return { key: columnKey, direction: newDirection };
    });
  };

  const sortedHistoricalRates = useMemo(() => {
    if (!flatHistoricalRates) return [];
    const sortableRates = [...flatHistoricalRates];
  
    if (sortConfig.key === 'date') {
      sortableRates.sort((a, b) => {
        const dateA = parseISO(a.date).getTime();
        const dateB = parseISO(b.date).getTime();
        if (sortConfig.direction === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    } else if (sortConfig.key === 'currencyLabelKey') {
      sortableRates.sort((a, b) => {
        const orderA = currencyOrder[a.currencyLabelKey] || 99;
        const orderB = currencyOrder[b.currencyLabelKey] || 99;
  
        let currencyComparison: number;
        if (sortConfig.direction === 'asc') { 
          currencyComparison = orderA - orderB;
        } else { 
          currencyComparison = orderB - orderA;
        }
  
        if (currencyComparison !== 0) {
          return currencyComparison;
        }
  
        const dateA = parseISO(a.date).getTime();
        const dateB = parseISO(b.date).getTime();
        return dateB - dateA;
      });
    }
    return sortableRates;
  }, [flatHistoricalRates, sortConfig]);

  const currenciesToDisplayInInfoCard = useMemo(() => {
    if (!currencyData) return [];
    return [
      { data: currencyData.USD_BLUE, labelKey: 'usdBlueLabel', icon: DollarSign },
      { data: currencyData.USD_OFICIAL, labelKey: 'usdOficialLabel', icon: DollarSign },
      { data: currencyData.EUR, labelKey: 'eurLabel', icon: Euro },
    ];
  }, [currencyData]);


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
        <header className="mb-6 sm:mb-10 text-center w-full">
          <div className="flex justify-center sm:justify-end w-full mb-2 sm:mb-0 sm:absolute sm:top-4 sm:right-4 md:top-6 md:right-6">
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mt-4 sm:mt-0">{t('headerTitle')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-lg mx-auto">
            {t('headerSubtitle')}
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <Card className="shadow-lg rounded-xl overflow-hidden border-border">
              <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
                <CardTitle className="flex items-center text-lg sm:text-xl">
                  <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {t('selectDateCardTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <Select
                    value={calendarMonth.getFullYear().toString()}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="w-full sm:w-[120px]">
                      <SelectValue placeholder={t('yearSelectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={calendarMonth.getMonth().toString()}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder={t('monthSelectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {localizedMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Calendar
                  key={calendarMonth.toISOString()}
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleCalendarDaySelect}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  className="rounded-md border shadow-sm bg-card w-full max-w-xs mx-auto"
                  disabled={(date) => date > new Date() || date < MIN_DATE} 
                  initialFocus
                  locale={dateLocale}
                  footer={
                    <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2 p-1">
                      {selectedDate ? t('calendarFooterWithDate', { date: format(selectedDate, 'PPP', { locale: dateLocale }) }) : t('calendarFooterNoDate')}
                    </p>
                  }
                />
              </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl overflow-hidden border-border">
              <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl">
                  <span className="flex items-center">
                    <Info className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary"/>
                    {t('currencyInfoCardTitle')}
                  </span>
                  <Button 
                      onClick={handleRefresh} 
                      variant="outline" 
                      size="icon" 
                      disabled={isLoading || !selectedDate} 
                      aria-label={t('refreshDataButtonLabel')}
                      className="border-primary text-primary hover:bg-primary/10 active:bg-primary/20"
                  >
                      <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 text-left min-h-[220px] flex flex-col justify-center">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center">
                    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm sm:text-base text-muted-foreground">{t('fetchingDataText')}</p>
                  </div>
                )}
                {!isLoading && currencyData && selectedDate && (
                  <>
                    <p className="font-semibold text-card-foreground mb-3 text-base">
                      {t('ratesForDateText', { date: displayDateInCard })}
                    </p>
                    <div className="space-y-3">
                      {currenciesToDisplayInInfoCard.map((currency, index) => (
                        currency.data ? (
                          <div key={index}>
                            <h4 className="flex items-center text-md font-semibold text-primary mb-0.5">
                              <currency.icon className="w-4 h-4 mr-1.5" />
                              {t(currency.labelKey as CurrencyLabelKey)}
                            </h4>
                            <div className="grid grid-cols-2 gap-x-2 pl-6 text-sm">
                              <p>
                                <span className="text-muted-foreground">{t('compraShort')}: </span>
                                <span className="font-medium text-card-foreground">
                                  {currency.data.compra !== null ? currency.data.compra.toFixed(2) : 'N/A'}
                                </span>
                              </p>
                              <p>
                                <span className="text-muted-foreground">{t('ventaShort')}: </span>
                                <span className="font-medium text-card-foreground">
                                  {currency.data.venta !== null ? currency.data.venta.toFixed(2) : 'N/A'} ARS
                                </span>
                              </p>
                            </div>
                            {(currency.data.compra === null && currency.data.venta === null) && (
                                <p className="pl-6 text-xs text-muted-foreground mt-0.5">{t('dataNotAvailableOnDateSimple')}</p>
                              )}
                          </div>
                        ) : (
                          <div key={index} className="flex items-center text-muted-foreground">
                            <currency.icon className="w-4 h-4 mr-1.5 opacity-50" />
                            <span className="text-sm">{t('noExchangeRateDataSpecificShort', { currency: t(currency.labelKey as CurrencyLabelKey) })}</span>
                          </div>
                        )
                      ))}
                    </div>
                    {!isModalOpen && (currencyData.USD_BLUE || currencyData.USD_OFICIAL || currencyData.EUR) && (
                      <Button onClick={() => setIsModalOpen(true)} variant="link" className="text-primary p-0 h-auto mt-3 text-xs sm:text-sm self-start">
                        {t('showFullDetailsButton')}
                      </Button>
                    )}
                    {(!currencyData.USD_BLUE && !currencyData.USD_OFICIAL && !currencyData.EUR) && (
                      <p className="mt-2 text-sm text-muted-foreground">{t('noExchangeRateDataGeneric', {date: displayDateInCard})}</p>
                    )}
                  </>
                )}
                {!isLoading && (!selectedDate || !currencyData) && (
                  <p className="text-sm sm:text-base text-muted-foreground text-center">
                    { calendarMonth ? t('pleaseSelectDay') : t('loadingDatePicker')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg rounded-xl overflow-hidden border-border lg:col-span-1">
            <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <History className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> {t('historyCardTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm sm:text-base text-muted-foreground">{t('historyLoadingText')}</p>
                </div>
              ) : sortedHistoricalRates.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs p-2 cursor-pointer hover:text-primary sticky left-0 bg-card z-10">
                          <Button variant="ghost" onClick={() => handleSort('date')} className="p-0 h-auto hover:bg-transparent text-xs font-medium text-muted-foreground hover:text-primary">
                            {t('historyTableDate')}
                            {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />)}
                            {sortConfig.key !== 'date' && <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-xs p-2 cursor-pointer hover:text-primary">
                           <Button variant="ghost" onClick={() => handleSort('currencyLabelKey')} className="p-0 h-auto hover:bg-transparent text-xs font-medium text-muted-foreground hover:text-primary">
                            {t('historyTableCurrency')}
                            {sortConfig.key === 'currencyLabelKey' && (sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 inline" /> : <ArrowDown className="ml-1 h-3 w-3 inline" />)}
                            {sortConfig.key !== 'currencyLabelKey' && <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />}
                          </Button>
                        </TableHead>
                        <TableHead className="text-right text-xs p-2">{t('historyTableBuy')}</TableHead>
                        <TableHead className="text-right text-xs px-3 py-2">{t('historyTableSell')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedHistoricalRates.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs p-2 whitespace-nowrap sticky left-0 bg-card z-0">
                             {format(parseISO(entry.date), 'EEEE, dd/MM', { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-xs p-2">{t(entry.currencyLabelKey)}</TableCell>
                          <TableCell className="text-right text-xs p-2">
                            {entry.buy !== null ? entry.buy.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right text-xs px-3 py-2">
                            {entry.sell !== null ? entry.sell.toFixed(2) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center min-h-[200px] flex items-center justify-center">
                  {t('historyNoDataText')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {modalContent && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-md bg-card text-card-foreground rounded-xl shadow-xl border-border">
              <DialogHeader className="p-6 pb-4 border-b border-border">
                <DialogTitle className="text-xl sm:text-2xl text-primary">{modalContent.title}</DialogTitle>
              </DialogHeader>
              <div className="p-6 text-base leading-relaxed">
                {modalContent.description}
              </div>
              <DialogFooter className="p-6 pt-4 border-t border-border">
                <Button onClick={() => setIsModalOpen(false)} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                  {t('modalCloseButton')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
      <footer className="text-center p-4 text-xs text-muted-foreground border-t border-border mt-auto">
        {t('footerCopyrightText', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}

