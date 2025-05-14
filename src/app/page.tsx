
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
  apiDate: string | null; 
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

  const fetchCurrencyData = useCallback(async (date: Date) => {
    setIsLoading(true);
    setCurrencyData(null); 

    const formattedDate = format(date, 'yyyy-MM-dd');

    try {
      let usdDataResponse, eurDataResponse;
      const errors: string[] = [];

      // Fetch USD data
      const usdResponse = await fetch(`https://api.frankfurter.app/${formattedDate}?from=USD&to=ARS`);
      if (usdResponse.ok) {
        usdDataResponse = await usdResponse.json();
      } else {
        let errorMsg = `USD: ${usdResponse.status} ${usdResponse.statusText || 'Failed to fetch'}`;
        try { const errorJson = await usdResponse.json(); if (errorJson.message) errorMsg = `USD: ${errorJson.message}`; } catch {}
        errors.push(errorMsg);
      }
      
      // Fetch EUR data
      const eurResponse = await fetch(`https://api.frankfurter.app/${formattedDate}?from=EUR&to=ARS`);
      if (eurResponse.ok) {
        eurDataResponse = await eurResponse.json();
      } else {
        let errorMsg = `EUR: ${eurResponse.status} ${eurResponse.statusText || 'Failed to fetch'}`;
        try { const errorJson = await eurResponse.json(); if (errorJson.message) errorMsg = `EUR: ${errorJson.message}`; } catch {}
        errors.push(errorMsg);
      }

      if (errors.length > 0 && (!usdDataResponse?.rates?.ARS && !eurDataResponse?.rates?.ARS)) {
        throw new Error(`API Error(s): ${errors.join('; ')}`);
      }
      
      const newCurrencyData: CurrencyData = {
        USD: usdDataResponse?.rates?.ARS ?? null,
        EUR: eurDataResponse?.rates?.ARS ?? null,
        apiDate: usdDataResponse?.date || eurDataResponse?.date || formattedDate,
      };
      setCurrencyData(newCurrencyData);

      const displayDate = newCurrencyData.apiDate ? format(parseISO(newCurrencyData.apiDate), 'PPP') : format(date, 'PPP');

      setModalContent({
        title: `Rates for ${displayDate}`,
        description: (
          <div className="space-y-3">
            {newCurrencyData.USD !== null ? (
              <p className="flex items-center text-lg">
                <DollarSign className="w-6 h-6 mr-2.5 text-primary" /> 
                <span className="font-semibold">USD:</span>&nbsp;{newCurrencyData.USD.toFixed(2)} ARS
              </p>
            ) : <p className="flex items-center text-muted-foreground"><DollarSign className="w-6 h-6 mr-2.5" /> USD data not available.</p>}
            {newCurrencyData.EUR !== null ? (
              <p className="flex items-center text-lg">
                <Euro className="w-6 h-6 mr-2.5 text-primary" /> 
                <span className="font-semibold">EUR:</span>&nbsp;{newCurrencyData.EUR.toFixed(2)} ARS
              </p>
            ) : <p className="flex items-center text-muted-foreground"><Euro className="w-6 h-6 mr-2.5" /> EUR data not available.</p>}
            {newCurrencyData.USD === null && newCurrencyData.EUR === null && (
                 <p className="text-destructive font-medium">No exchange rate data found for this date.</p>
            )}
          </div>
        )
      });
      setIsModalOpen(true);

    } catch (error: any) {
      console.error("Error fetching currency data:", error);
      const displayDate = format(date, 'PPP');
      setModalContent({
        title: `Error for ${displayDate}`,
        description: <p className="text-destructive font-medium">{error.message || "An unknown error occurred while fetching data."}</p>
      });
      setIsModalOpen(true);
      setCurrencyData({ USD: null, EUR: null, apiDate: formattedDate }); 
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // toast is stable, so it doesn't need to be in deps if it's from useToast

  useEffect(() => {
    if (selectedDate) {
      fetchCurrencyData(selectedDate);
    }
  }, [selectedDate, fetchCurrencyData]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Prevent fetching for future dates client-side
      if (date > new Date()) {
        toast({
          title: "Invalid Date",
          description: "Cannot fetch exchange rates for future dates. Please select a past or current date.",
          variant: "destructive",
          duration: 3000,
        });
        // Optionally, reset selectedDate or keep the old one
        // setSelectedDate(new Date()); // Or keep previous valid date
        return;
      }
      setSelectedDate(date);
    }
  };

  const handleRefresh = () => {
    if (selectedDate) {
      fetchCurrencyData(selectedDate);
    } else {
      toast({
        title: "No Date Selected",
        description: "Please select a date to refresh data.",
        duration: 3000,
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">Peso Watcher</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-md mx-auto">
            Select a date to check historical US Dollar & Euro values in Argentinian Pesos (ARS).
          </p>
        </header>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl">
          <Card className="shadow-lg rounded-xl overflow-hidden border-border">
            <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-2 sm:p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border shadow-sm bg-card"
                disabled={(date) => date > new Date() || date < new Date("2000-01-01")} // Frankfurter typical historical range
                footer={
                  <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2 p-1">
                    {selectedDate ? `Selected: ${format(selectedDate, 'PPP')}` : "Pick a day."}
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
            <CardContent className="p-4 sm:p-6 space-y-4 text-center min-h-[120px] flex flex-col justify-center items-center">
              {isLoading && (
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm sm:text-base text-muted-foreground">Fetching data...</p>
                </div>
              )}
              {!isLoading && selectedDate && (
                <div className="text-sm sm:text-base text-muted-foreground">
                  <p>
                    Rates for {currencyData?.apiDate ? format(parseISO(currencyData.apiDate), 'PPP') : (selectedDate ? format(selectedDate, 'PPP'): 'the selected date')} will be shown in the modal.
                  </p>
                  {!isModalOpen && currencyData && (currencyData.USD !== null || currencyData.EUR !== null) && (
                      <Button onClick={() => setIsModalOpen(true)} variant="link" className="text-primary p-0 h-auto mt-1 text-sm sm:text-base">
                        Re-open Modal
                      </Button>
                  )}
                </div>
              )}
              {!isLoading && !selectedDate && (
                <p className="text-sm sm:text-base text-muted-foreground">Please select a date from the calendar to view exchange rates.</p>
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
