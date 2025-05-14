
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format, parse, parseISO, isValid } from 'date-fns';
import { Calendar as CalendarIcon, DollarSign, Euro, RefreshCw, Info } from 'lucide-react';

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

interface UsdQuote {
  compra: number | null;
  venta: number | null;
}

interface CurrencyData {
  USD_BLUE: UsdQuote | null;
  USD_OFICIAL: UsdQuote | null;
  EUR: UsdQuote | null; 
  quoteDate: string | null; 
}

interface ModalContent {
  title: string;
  description: ReactNode;
}

const MIN_DATE = new Date("2000-01-01");

export default function PesoWatcherPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [currencyData, setCurrencyData] = useState<CurrencyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const { toast } = useToast();

  const fetchCurrencyData = useCallback(async () => {
    if (!selectedDate || !isValid(selectedDate)) {
      toast({
        title: "No Valid Date Selected",
        description: "Please select a valid date to fetch currency data.",
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
             errors.push(`USD (Blue) data for ${format(selectedDate, 'P')} not found or compra/venta fields missing/invalid.`);
          }
        } else {
          let errorMsg = `USD (Blue) API (${format(selectedDate, 'P')}): ${usdBlueResponse.status} ${usdBlueResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await usdBlueResponse.json(); if (errorJson.error) errorMsg = `USD (Blue) API Error (${format(selectedDate, 'P')}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `USD (Blue) API Error (${format(selectedDate, 'P')}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`USD (Blue) API Fetch Error (${format(selectedDate, 'P')}): ${error.message || 'Network error'}`);
      }

      // Fetch USD Oficial data
      try {
        const usdOficialResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${formattedDateForPath}`);
        if (usdOficialResponse.ok) {
          const data = await usdOficialResponse.json();
          if (data && typeof data.compra === 'number' && typeof data.venta === 'number') {
            usdOficialValues = { compra: data.compra, venta: data.venta };
          } else {
            errors.push(`USD (Oficial) data for ${format(selectedDate, 'P')} not found or compra/venta fields missing/invalid.`);
          }
        } else {
          let errorMsg = `USD (Oficial) API (${format(selectedDate, 'P')}): ${usdOficialResponse.status} ${usdOficialResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await usdOficialResponse.json(); if (errorJson.error) errorMsg = `USD (Oficial) API Error (${format(selectedDate, 'P')}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `USD (Oficial) API Error (${format(selectedDate, 'P')}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`USD (Oficial) API Fetch Error (${format(selectedDate, 'P')}): ${error.message || 'Network error'}`);
      }
      
      // Fetch EUR data
      try {
        const eurResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/eur/${formattedDateForPath}`);
        if (eurResponse.ok) {
          const data = await eurResponse.json();
          if (data && typeof data.compra === 'number' && typeof data.venta === 'number') {
            eurValues = { compra: data.compra, venta: data.venta };
          } else {
            errors.push(`EUR data for ${format(selectedDate, 'P')} not found or compra/venta fields missing/invalid.`);
          }
        } else {
          let errorMsg = `EUR API (${format(selectedDate, 'P')}): ${eurResponse.status} ${eurResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await eurResponse.json(); if (errorJson.error) errorMsg = `EUR API Error (${format(selectedDate, 'P')}): ${errorJson.error}`; else if (errorJson.message) errorMsg = `EUR API Error (${format(selectedDate, 'P')}): ${errorJson.message}`;} catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`EUR API Fetch Error (${format(selectedDate, 'P')}): ${error.message || 'Network error'}`);
      }
      
      if (errors.length > 0 && !usdBlueValues && !usdOficialValues && !eurValues) {
         toast({
          title: "API Errors",
          description: (
              <div className="max-h-40 overflow-y-auto">
                  {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
          ), // Added missing comma
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

      const modalTitle = "Currency Exchange Rates";
      const displayDate = newCurrencyData.quoteDate ? format(parse(newCurrencyData.quoteDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : format(selectedDate, 'MMM d, yyyy');
      
      const modalDescription = (
        <div className="space-y-4">
          {/* USD Blue */}
          {newCurrencyData.USD_BLUE && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <DollarSign className="w-5 h-5 mr-2 text-primary" /> 
                USD (Blue) for {displayDate}:
              </p>
              {newCurrencyData.USD_BLUE.compra !== null && (
                <p className="ml-7 text-md">Compra: <span className="font-medium">{newCurrencyData.USD_BLUE.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.USD_BLUE.venta !== null && (
                <p className="ml-7 text-md">Venta: <span className="font-medium">{newCurrencyData.USD_BLUE.venta.toFixed(2)} ARS</span></p>
              )}
               {(newCurrencyData.USD_BLUE.compra === null && newCurrencyData.USD_BLUE.venta === null) && (
                <p className="ml-7 text-sm text-muted-foreground">No data available for USD (Blue) on this date.</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-5 h-5 mr-2" /> USD (Blue) data not available for {displayDate}.</p>}
          
          {/* USD Oficial */}
          {newCurrencyData.USD_OFICIAL && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <DollarSign className="w-5 h-5 mr-2 text-primary" /> 
                USD (Oficial) for {displayDate}:
              </p>
               {newCurrencyData.USD_OFICIAL.compra !== null && (
                <p className="ml-7 text-md">Compra: <span className="font-medium">{newCurrencyData.USD_OFICIAL.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.USD_OFICIAL.venta !== null && (
                <p className="ml-7 text-md">Venta: <span className="font-medium">{newCurrencyData.USD_OFICIAL.venta.toFixed(2)} ARS</span></p>
              )}
              {(newCurrencyData.USD_OFICIAL.compra === null && newCurrencyData.USD_OFICIAL.venta === null) && (
                <p className="ml-7 text-sm text-muted-foreground">No data available for USD (Oficial) on this date.</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-5 h-5 mr-2" /> USD (Oficial) data not available for {displayDate}.</p>}

          {/* EUR */}
          {newCurrencyData.EUR && newCurrencyData.quoteDate ? (
            <div>
              <p className="flex items-center text-lg font-semibold text-primary mb-1">
                <Euro className="w-5 h-5 mr-2 text-primary" /> 
                EUR (Official) for {displayDate}:
              </p>
              {newCurrencyData.EUR.compra !== null && (
                <p className="ml-7 text-md">Compra: <span className="font-medium">{newCurrencyData.EUR.compra.toFixed(2)} ARS</span></p>
              )}
              {newCurrencyData.EUR.venta !== null && (
                <p className="ml-7 text-md">Venta: <span className="font-medium">{newCurrencyData.EUR.venta.toFixed(2)} ARS</span></p>
              )}
              {(newCurrencyData.EUR.compra === null && newCurrencyData.EUR.venta === null) && (
                 <p className="ml-7 text-sm text-muted-foreground">No data available for EUR (Official) on this date.</p>
              )}
            </div>
          ) : <p className="flex items-center text-muted-foreground"><Euro className="w-5 h-5 mr-2" /> EUR (Official) data not available for {displayDate}.</p>}


          {errors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                  <p className="font-medium text-destructive text-sm">Encountered Issues:</p>
                  <ul className="list-disc list-inside text-destructive text-xs max-h-20 overflow-y-auto">
                      {errors.map((e,i) => <li key={i}>{e}</li>)}
                  </ul>
              </div>
          )}
          {!newCurrencyData.USD_BLUE && !newCurrencyData.USD_OFICIAL && !newCurrencyData.EUR && errors.length === 0 && (
               <p className="text-destructive font-medium">No exchange rate data found for the selected criteria for {displayDate}.</p>
          )}
        </div>
      );

      setModalContent({
        title: modalTitle,
        description: modalDescription
      });
      setIsModalOpen(true);

    } catch (error: any) { 
      console.error("Critical error in fetchCurrencyData:", error);
      setModalContent({
        title: "Critical Error",
        description: <p className="text-destructive font-medium">{error.message || "An unexpected critical error occurred."}</p>
      });
      setIsModalOpen(true);
      setCurrencyData({ USD_BLUE: null, USD_OFICIAL: null, EUR: null, quoteDate: null }); 
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, toast]); 

  useEffect(() => {
    if (selectedDate) {
      fetchCurrencyData();
    }
  }, [selectedDate, fetchCurrencyData]);

  useEffect(() => {
    if (selectedDate) {
      const newCalMonthForSelectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      if (calendarMonth.getTime() !== newCalMonthForSelectedDate.getTime()) {
        setCalendarMonth(newCalMonthForSelectedDate);
      }
    }
  }, [selectedDate, calendarMonth]);


  const currentYr = new Date().getFullYear();
  const years = Array.from({ length: currentYr - MIN_DATE.getFullYear() + 1 }, (_, i) => currentYr - i);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i, 1), 'MMMM'),
  }));

  const handleYearChange = (yearStr: string) => {
    const newYear = parseInt(yearStr);
    const sDate = selectedDate || new Date();
    const currentMonth = sDate.getMonth();
    const currentDay = sDate.getDate();

    let newDateCandidate = new Date(newYear, currentMonth, currentDay);
    if (newDateCandidate.getMonth() !== currentMonth) { // Day is out of bounds for the new month
      newDateCandidate = new Date(newYear, currentMonth + 1, 0); // Go to last day of month
    }

    if (newDateCandidate > new Date()) {
      toast({ title: "Invalid Date", description: "Cannot select future dates. Resetting to today.", variant: "destructive", duration: 3000 });
      newDateCandidate = new Date();
    } else if (newDateCandidate < MIN_DATE) {
      toast({ title: "Invalid Date", description: `Date cannot be before ${format(MIN_DATE, 'P')}. Resetting to ${format(MIN_DATE, 'P')}.`, variant: "destructive", duration: 3000 });
      newDateCandidate = new Date(MIN_DATE);
    }
    setSelectedDate(newDateCandidate);
  };

  const handleMonthChange = (monthStr: string) => {
    const newMonth = parseInt(monthStr);
    const sDate = selectedDate || new Date();
    const currentYear = sDate.getFullYear();
    const currentDay = sDate.getDate();

    let newDateCandidate = new Date(currentYear, newMonth, currentDay);
    if (newDateCandidate.getMonth() !== newMonth) { // Day is out of bounds for the new month
      newDateCandidate = new Date(currentYear, newMonth + 1, 0); // Go to last day of month
    }
    
    if (newDateCandidate > new Date()) {
      toast({ title: "Invalid Date", description: "Cannot select future dates. Resetting to today.", variant: "destructive", duration: 3000 });
      newDateCandidate = new Date();
    } else if (newDateCandidate < MIN_DATE) {
      toast({ title: "Invalid Date", description: `Date cannot be before ${format(MIN_DATE, 'P')}. Resetting to ${format(MIN_DATE, 'P')}.`, variant: "destructive", duration: 3000 });
      newDateCandidate = new Date(MIN_DATE);
    }
    setSelectedDate(newDateCandidate);
  };

  const handleCalendarDaySelect = (date: Date | undefined) => {
    if (date) {
      if (date > new Date()) {
        toast({ title: "Invalid Date", description: "Cannot select future dates. Resetting to today.", variant: "destructive", duration: 3000 });
        setSelectedDate(new Date());
        return;
      }
      if (date < MIN_DATE) {
        toast({ title: "Invalid Date", description: `Date cannot be before ${format(MIN_DATE, 'P')}. Resetting to ${format(MIN_DATE, 'P')}.`, variant: "destructive", duration: 3000 });
        setSelectedDate(new Date(MIN_DATE));
        return;
      }
      setSelectedDate(date);
    }
  };


  const handleRefresh = () => {
    if (selectedDate) {
        fetchCurrencyData(); 
    } else {
        toast({ title: "Select a Date", description: "Please select a date first to refresh.", variant: "default"});
    }
  };
  
  const displayDateInCard = currencyData?.quoteDate && selectedDate ? format(parse(currencyData.quoteDate, 'yyyy-MM-dd', selectedDate), 'PPP') : (selectedDate ? format(selectedDate, 'PPP') : 'selected date');
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">Peso Watcher</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-lg mx-auto">
            View US Dollar (Blue & Oficial - Compra/Venta) and Euro (Official - Compra/Venta) for selected date in Argentinian Pesos (ARS).
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl">
          <Card className="shadow-lg rounded-xl overflow-hidden border-border">
            <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Select Date for Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Select
                  value={(selectedDate || new Date()).getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Year" />
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
                  value={(selectedDate || new Date()).getMonth().toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarDaySelect}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                className="rounded-md border shadow-sm bg-card mx-auto"
                disabled={(date) => date > new Date() || date < MIN_DATE} 
                initialFocus
                footer={
                  <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2 p-1">
                    {selectedDate ? `Selected: ${format(selectedDate, 'PPP')}` : "Pick a day for exchange rates."}
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
                  Currency Information
                </span>
                <Button 
                    onClick={handleRefresh} 
                    variant="outline" 
                    size="icon" 
                    disabled={isLoading || !selectedDate} 
                    aria-label="Refresh data"
                    className="border-primary text-primary hover:bg-primary/10 active:bg-primary/20"
                >
                    <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-3 text-left min-h-[180px] flex flex-col justify-center">
              {isLoading && (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm sm:text-base text-muted-foreground">Fetching data...</p>
                </div>
              )}
              {!isLoading && currencyData && selectedDate && (
                <div className="text-xs sm:text-sm text-muted-foreground space-y-2">
                  {currencyData.quoteDate && (
                    <p className="font-semibold text-card-foreground mb-1">Rates for: {displayDateInCard}</p>
                  )}
                  {/* USD Blue in Card */}
                  {currencyData.USD_BLUE ? (
                    <div>
                      <span className="font-medium text-card-foreground">USD (Blue):</span>
                      {currencyData.USD_BLUE.compra !== null ? (
                        <span> C: <span className="font-bold text-card-foreground">{currencyData.USD_BLUE.compra.toFixed(2)}</span></span>
                      ) : <span className="text-xs"> C: N/A</span>}
                      {currencyData.USD_BLUE.venta !== null ? (
                        <span> V: <span className="font-bold text-card-foreground">{currencyData.USD_BLUE.venta.toFixed(2)} ARS</span></span>
                      ) : <span className="text-xs"> V: N/A ARS</span>}
                    </div>
                  ) : (
                    <p>USD (Blue) data unavailable for {displayDateInCard}.</p>
                  )}

                  {/* USD Oficial in Card */}
                  {currencyData.USD_OFICIAL ? (
                     <div>
                      <span className="font-medium text-card-foreground">USD (Oficial):</span>
                      {currencyData.USD_OFICIAL.compra !== null ? (
                        <span> C: <span className="font-bold text-card-foreground">{currencyData.USD_OFICIAL.compra.toFixed(2)}</span></span>
                      ) : <span className="text-xs"> C: N/A</span>}
                      {currencyData.USD_OFICIAL.venta !== null ? (
                        <span> V: <span className="font-bold text-card-foreground">{currencyData.USD_OFICIAL.venta.toFixed(2)} ARS</span></span>
                      ) : <span className="text-xs"> V: N/A ARS</span>}
                    </div>
                  ) : (
                    <p>USD (Oficial) data unavailable for {displayDateInCard}.</p>
                  )}
                  
                  {/* EUR in Card */}
                  {currencyData.EUR ? (
                     <div>
                      <span className="font-medium text-card-foreground">EUR (Official):</span>
                      {currencyData.EUR.compra !== null ? (
                        <span> C: <span className="font-bold text-card-foreground">{currencyData.EUR.compra.toFixed(2)}</span></span>
                      ) : <span className="text-xs"> C: N/A</span>}
                      {currencyData.EUR.venta !== null ? (
                        <span> V: <span className="font-bold text-card-foreground">{currencyData.EUR.venta.toFixed(2)} ARS</span></span>
                      ) : <span className="text-xs"> V: N/A ARS</span>}
                    </div>
                  ) : (
                     <p>EUR (Official) data unavailable for {displayDateInCard}.</p>
                  )}

                   {!isModalOpen && (currencyData.USD_BLUE || currencyData.USD_OFICIAL || currencyData.EUR) && (
                        <Button onClick={() => setIsModalOpen(true)} variant="link" className="text-primary p-0 h-auto mt-2 text-xs sm:text-sm">
                          Show Full Details
                        </Button>
                    )}
                    {(!currencyData.USD_BLUE && !currencyData.USD_OFICIAL && !currencyData.EUR) && (
                        <p className="mt-2">No exchange rate data currently available for the selected criteria for {displayDateInCard}.</p>
                    )}
                </div>
              )}
               {!isLoading && (!currencyData || !selectedDate) && (
                  <p className="text-sm sm:text-base text-muted-foreground text-center">
                    {selectedDate ? "Click refresh or select a date to fetch rates." : "Please select a date from the calendar."}
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
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </main>
      <footer className="text-center p-4 text-xs text-muted-foreground border-t border-border mt-auto">
        Peso Watcher &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

    