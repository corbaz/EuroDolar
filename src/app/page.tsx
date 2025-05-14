
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, parse } from 'date-fns';
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

interface CurrencyData {
  USD: number | null;
  EUR: number | null;
  usdQuoteDate: string | null; // Date for which USD quote is (YYYY-MM-DD from selectedDate)
  eurLatestUpdate: string | null; // Timestamp of latest EUR quote from its API
}

interface ModalContent {
  title: string;
  description: ReactNode;
}

export default function PesoWatcherPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currencyData, setCurrencyData] = useState<CurrencyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const { toast } = useToast();

  const fetchCurrencyData = useCallback(async () => {
    if (!selectedDate) {
      toast({
        title: "No Date Selected",
        description: "Please select a date to fetch currency data.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setCurrencyData(null);

      const formattedDateForUsdApi = format(selectedDate, 'yyyy-MM-dd');
      let usdValue: number | null = null;
      let eurValue: number | null = null;
      let eurApiUpdateTime: string | null = null;
      const errors: string[] = [];

      // Fetch USD data from Argentinadatos API for the selected date (Blue Dollar)
      try {
        const usdResponse = await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/${formattedDateForUsdApi}`);
        if (usdResponse.ok) {
          const usdData = await usdResponse.json();
          if (usdData && typeof usdData.venta === 'number') {
            usdValue = usdData.venta;
          } else {
            errors.push(`USD (Blue) data for ${formattedDateForUsdApi} not found or 'venta' field missing/invalid in Argentinadatos response.`);
          }
        } else {
          let errorMsg = `USD API (${formattedDateForUsdApi}): ${usdResponse.status} ${usdResponse.statusText || 'Failed to fetch'}`;
          try { 
            const errorJson = await usdResponse.json(); 
            if (errorJson.error) errorMsg = `USD API Error (${formattedDateForUsdApi}): ${errorJson.error}`; 
            else if (errorJson.message) errorMsg = `USD API Error (${formattedDateForUsdApi}): ${errorJson.message}`;
          } catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`USD API Fetch Error (${formattedDateForUsdApi}): ${error.message || 'Network error or API unavailable'}`);
      }
      
      // Fetch EUR data from DolarAPI (Latest Official Euro)
      try {
        const eurResponse = await fetch(`https://dolarapi.com/v1/cotizaciones/eur`);
        if (eurResponse.ok) {
          const eurData = await eurResponse.json();
          if (eurData && typeof eurData.venta === 'number') {
            eurValue = eurData.venta;
            eurApiUpdateTime = eurData.fechaActualizacion; // This is an ISO string
          } else {
            errors.push("EUR data not found or 'venta' field missing/invalid in DolarAPI response.");
          }
        } else {
          let errorMsg = `EUR API: ${eurResponse.status} ${eurResponse.statusText || 'Failed to fetch'}`;
          try { const errorJson = await eurResponse.json(); if (errorJson.message) errorMsg = `EUR API Error: ${errorJson.message}`; } catch {}
          errors.push(errorMsg);
        }
      } catch (error: any) {
          errors.push(`EUR API Fetch Error: ${error.message || 'Network error or API unavailable'}`);
      }

      if (errors.length > 0 && usdValue === null && eurValue === null) {
         toast({
          title: "API Errors",
          description: (
              <div className="max-h-40 overflow-y-auto">
                  {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
          ), // Fixed: Added comma here
          variant: "destructive",
          duration: 5000,
        });
      }
      
      const newCurrencyData: CurrencyData = {
        USD: usdValue,
        EUR: eurValue,
        usdQuoteDate: usdValue !== null ? formattedDateForUsdApi : null,
        eurLatestUpdate: eurApiUpdateTime,
      };
      setCurrencyData(newCurrencyData);

      const modalTitle = "Currency Exchange Rates";
      const modalDescription = (
        <div className="space-y-3">
          {newCurrencyData.USD !== null && newCurrencyData.usdQuoteDate ? (
            <p className="flex items-center text-lg">
              <DollarSign className="w-6 h-6 mr-2.5 text-primary" /> 
              <span className="font-semibold">USD (Blue) for {format(parse(newCurrencyData.usdQuoteDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}:</span>
              &nbsp;{newCurrencyData.USD.toFixed(2)} ARS
            </p>
          ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-6 h-6 mr-2.5" /> USD (Blue) data not available for {format(selectedDate, 'MMM d, yyyy')}.</p>}
          
          {newCurrencyData.EUR !== null && newCurrencyData.eurLatestUpdate ? (
            <p className="flex items-center text-lg">
              <Euro className="w-6 h-6 mr-2.5 text-primary" /> 
              <span className="font-semibold">EUR (Official) - Latest:</span>
              &nbsp;{newCurrencyData.EUR.toFixed(2)} ARS 
              <span className="text-xs ml-1 text-muted-foreground">(as of {format(parseISO(newCurrencyData.eurLatestUpdate), 'HH:mm')})</span>
            </p>
          ) : <p className="flex items-center text-muted-foreground"><Euro className="w-6 h-6 mr-2.5" /> EUR (Official) latest data not available.</p>}

          {errors.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                  <p className="font-medium text-destructive text-sm">Encountered Issues:</p>
                  <ul className="list-disc list-inside text-destructive text-xs max-h-20 overflow-y-auto">
                      {errors.map((e,i) => <li key={i}>{e}</li>)}
                  </ul>
              </div>
          )}
          {newCurrencyData.USD === null && newCurrencyData.EUR === null && errors.length === 0 && (
               <p className="text-destructive font-medium">No exchange rate data found for the selected criteria.</p>
          )}
        </div>
      );

      setModalContent({
        title: modalTitle,
        description: modalDescription
      });
      setIsModalOpen(true);

    } catch (error: any) { // Catch for the entire fetchCurrencyData logic, though individual fetches have their own try/catch
      console.error("Critical error in fetchCurrencyData:", error);
      setModalContent({
        title: "Critical Error",
        description: <p className="text-destructive font-medium">{error.message || "An unexpected critical error occurred."}</p>
      });
      setIsModalOpen(true);
      setCurrencyData({ USD: null, EUR: null, usdQuoteDate: null, eurLatestUpdate: null }); 
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

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      if (date > new Date()) {
        toast({
          title: "Invalid Date",
          description: "Cannot select future dates. Showing data for today.",
          variant: "destructive",
          duration: 3000,
        });
        setSelectedDate(new Date()); 
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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">Peso Watcher</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-md mx-auto">
            View US Dollar (Blue) for selected date & latest Euro (Official) values in Argentinian Pesos (ARS).
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl">
          <Card className="shadow-lg rounded-xl overflow-hidden border-border">
            <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Select Date for USD Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-2 sm:p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border shadow-sm bg-card"
                disabled={(date) => date > new Date() || date < new Date("2000-01-01")} 
                footer={
                  <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2 p-1">
                    {selectedDate ? `Selected: ${format(selectedDate, 'PPP')}` : "Pick a day for USD rate."}
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
            <CardContent className="p-4 sm:p-6 space-y-2 text-left min-h-[120px] flex flex-col justify-center">
              {isLoading && (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm sm:text-base text-muted-foreground">Fetching data...</p>
                </div>
              )}
              {!isLoading && currencyData && (
                <div className="text-sm sm:text-base text-muted-foreground">
                  {currencyData.usdQuoteDate && currencyData.USD !== null ? (
                    <p>
                      USD (Blue) for <span className="font-semibold text-card-foreground">{format(parse(currencyData.usdQuoteDate, 'yyyy-MM-dd', new Date()), 'PPP')}</span>: 
                      <span className="font-bold text-card-foreground"> {currencyData.USD.toFixed(2)} ARS</span>
                    </p>
                  ) : (
                    <p>USD (Blue) data for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'} is unavailable.</p>
                  )}
                  {currencyData.eurLatestUpdate && currencyData.EUR !== null ? (
                    <p>
                      EUR (Official) - Latest <span className="text-xs">(as of {format(parseISO(currencyData.eurLatestUpdate), 'HH:mm')})</span>:
                      <span className="font-bold text-card-foreground"> {currencyData.EUR.toFixed(2)} ARS</span>
                    </p>
                  ) : (
                     <p>EUR (Official) latest data is unavailable.</p>
                  )}
                   {!isModalOpen && (currencyData.USD !== null || currencyData.EUR !== null) && (
                        <Button onClick={() => setIsModalOpen(true)} variant="link" className="text-primary p-0 h-auto mt-2 text-sm sm:text-base">
                          Show Details in Modal
                        </Button>
                    )}
                    {(currencyData.USD === null && currencyData.EUR === null) && (
                        <p className="mt-2">No exchange rate data currently available for the selected criteria.</p>
                    )}
                </div>
              )}
               {!isLoading && !currencyData && (
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
