
"use client";

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
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
// Skeleton component is not used in the final version but kept for potential future use
// import { Skeleton } from '@/components/ui/skeleton'; 

interface CurrencyData {
  USD: number | null;
  EUR: number | null;
  apiDate: string | null; // Will store ISO string from API's 'fechaActualizacion'
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
    setIsLoading(true);
    setCurrencyData(null); 

    try {
      let usdValue: number | null = null;
      let eurValue: number | null = null;
      let usdApiUpdateTime: string | null = null;
      let eurApiUpdateTime: string | null = null;
      const errors: string[] = [];

      // Fetch USD data from DolarAPI (Blue Dollar)
      const usdResponse = await fetch(`https://dolarapi.com/v1/dolares`);
      if (usdResponse.ok) {
        const usdDataArray = await usdResponse.json();
        const blueUsd = usdDataArray.find((d: any) => d.casa === 'blue');
        if (blueUsd && typeof blueUsd.venta === 'number') {
          usdValue = blueUsd.venta;
          usdApiUpdateTime = blueUsd.fechaActualizacion;
        } else {
          errors.push("USD (Blue) data not found or 'venta' field missing/invalid in DolarAPI response.");
        }
      } else {
        let errorMsg = `USD API: ${usdResponse.status} ${usdResponse.statusText || 'Failed to fetch'}`;
        try { const errorJson = await usdResponse.json(); if (errorJson.message) errorMsg = `USD API Error: ${errorJson.message}`; } catch {}
        errors.push(errorMsg);
      }
      
      // Fetch EUR data from DolarAPI (Official Euro as per provided link)
      const eurResponse = await fetch(`https://dolarapi.com/v1/cotizaciones/eur`);
      if (eurResponse.ok) {
        const eurData = await eurResponse.json();
        if (eurData && typeof eurData.venta === 'number') {
          eurValue = eurData.venta;
          eurApiUpdateTime = eurData.fechaActualizacion;
        } else {
          errors.push("EUR data not found or 'venta' field missing/invalid in DolarAPI response.");
        }
      } else {
        let errorMsg = `EUR API: ${eurResponse.status} ${eurResponse.statusText || 'Failed to fetch'}`;
        try { const errorJson = await eurResponse.json(); if (errorJson.message) errorMsg = `EUR API Error: ${errorJson.message}`; } catch {}
        errors.push(errorMsg);
      }

      if (errors.length > 0 && usdValue === null && eurValue === null) {
        throw new Error(`API Error(s): ${errors.join('; ')}`);
      }
      
      let finalApiDate: string | null = null;
      if (usdApiUpdateTime && eurApiUpdateTime) {
        finalApiDate = new Date(usdApiUpdateTime) > new Date(eurApiUpdateTime) ? usdApiUpdateTime : eurApiUpdateTime;
      } else {
        finalApiDate = usdApiUpdateTime || eurApiUpdateTime;
      }

      const newCurrencyData: CurrencyData = {
        USD: usdValue,
        EUR: eurValue,
        apiDate: finalApiDate,
      };
      setCurrencyData(newCurrencyData);

      const modalTitleDateString = newCurrencyData.apiDate 
          ? `Latest Rates (as of ${format(parseISO(newCurrencyData.apiDate), 'MMM d, yyyy HH:mm')})`
          : "Latest Available Rates";

      setModalContent({
        title: modalTitleDateString,
        description: (
          <div className="space-y-3">
            {newCurrencyData.USD !== null ? (
              <p className="flex items-center text-lg">
                <DollarSign className="w-6 h-6 mr-2.5 text-primary" /> 
                <span className="font-semibold">USD (Blue):</span>&nbsp;{newCurrencyData.USD.toFixed(2)} ARS
              </p>
            ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-6 h-6 mr-2.5" /> USD (Blue) data not available.</p>}
            {newCurrencyData.EUR !== null ? (
              <p className="flex items-center text-lg">
                <Euro className="w-6 h-6 mr-2.5 text-primary" /> 
                <span className="font-semibold">EUR (Official):</span>&nbsp;{newCurrencyData.EUR.toFixed(2)} ARS
              </p>
            ) : <p className="flex items-center text-muted-foreground"><Euro className="w-6 h-6 mr-2.5" /> EUR (Official) data not available.</p>}
            {newCurrencyData.USD === null && newCurrencyData.EUR === null && (
                 <p className="text-destructive font-medium">No exchange rate data found from DolarAPI.</p>
            )}
          </div>
        )
      });
      setIsModalOpen(true);

    } catch (error: any) {
      console.error("Error fetching currency data from DolarAPI:", error);
      setModalContent({
        title: "Error Fetching Latest Rates",
        description: <p className="text-destructive font-medium">{error.message || "An unknown error occurred while fetching data from DolarAPI."}</p>
      });
      setIsModalOpen(true);
      setCurrencyData({ USD: null, EUR: null, apiDate: null }); 
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
          description: "Cannot select future dates. Showing latest rates.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      setSelectedDate(date); // This will trigger useEffect, which calls fetchCurrencyData
    }
  };

  const handleRefresh = () => {
    fetchCurrencyData(); // Always fetch latest data on refresh
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">Peso Watcher</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-md mx-auto">
            View the latest US Dollar & Euro values in Argentinian Pesos (ARS). Data is updated when you select a date or refresh.
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl">
          <Card className="shadow-lg rounded-xl overflow-hidden border-border">
            <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Select Date to Refresh
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
                    {selectedDate ? `Selected: ${format(selectedDate, 'PPP')}` : "Pick a day to refresh data."}
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
                    disabled={isLoading} 
                    aria-label="Refresh data"
                    className="border-primary text-primary hover:bg-primary/10 active:bg-primary/20"
                >
                    <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 text-center min-h-[120px] flex flex-col justify-center items-center">
              {isLoading && (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm sm:text-base text-muted-foreground">Fetching latest data...</p>
                </div>
              )}
              {!isLoading && (
                currencyData && currencyData.apiDate ? (
                  <div className="text-sm sm:text-base text-muted-foreground">
                    <p>
                      Displaying latest rates updated on: <br />
                      <span className="font-semibold">{format(parseISO(currencyData.apiDate), 'PPP p')}</span>.
                    </p>
                    {!isModalOpen && (currencyData.USD !== null || currencyData.EUR !== null) && (
                        <Button onClick={() => setIsModalOpen(true)} variant="link" className="text-primary p-0 h-auto mt-1 text-sm sm:text-base">
                          Re-open Modal
                        </Button>
                    )}
                  </div>
                ) : !isLoading && (
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {selectedDate ? "Click refresh or select a date to fetch the latest rates." : "Please select a date from the calendar to fetch latest rates."}
                  </p>
                )
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
