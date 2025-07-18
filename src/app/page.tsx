"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    Suspense,
    useRef,
} from "react";
import type { ReactNode } from "react";
import {
    format,
    parse,
    isValid,
    startOfMonth,
    subDays,
    isWeekend,
    parseISO,
} from "date-fns";
import {
    Calendar as CalendarIcon,
    DollarSign,
    Euro,
    History,
    ArrowUp,
    ArrowDown,
    ChevronsUpDown,
    RefreshCw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CurrencyBg } from "@/components/ui/currency-bg";
import { Checkbox } from "@/components/ui/checkbox";

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

type CurrencyLabelKey = "usdBlueLabel" | "usdOficialLabel" | "eurLabel";

interface HistoricalRateEntry {
    id: string; // e.g., "2024-07-18-USD_BLUE"
    date: string; // ISO string "YYYY-MM-DD"
    currencyLabelKey: CurrencyLabelKey;
    buy: number | null;
    sell: number | null;
}

const MIN_DATE = new Date("2000-01-01");
MIN_DATE.setHours(0, 0, 0, 0);

const MIN_CALENDAR_MONTH = startOfMonth(MIN_DATE);
const currencyOrder: Record<CurrencyLabelKey, number> = {
    usdBlueLabel: 1,
    usdOficialLabel: 2,
    eurLabel: 3,
};

function PageLoading() {
    const { t } = useLanguage();
    return (
        <div className="dolar-background flex flex-col min-h-screen bg-background text-foreground items-center justify-center p-4">
            <RefreshCw className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mb-3 sm:mb-4" />
            <p className="text-lg sm:text-xl text-muted-foreground">
                {t("loadingDatePicker")}
            </p>
        </div>
    );
}

function PesoWatcherPageContent() {
    const { t, dateLocale } = useLanguage();
    const { toast } = useToast();
    const historyTableRef = useRef<HTMLDivElement>(null);
    const [tableSortEffect, setTableSortEffect] = useState(false);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const _searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined
    );
    const [calendarMonth, setCalendarMonth] = useState<Date>(
        startOfMonth(new Date())
    );
    const [_currencyData, setCurrencyData] = useState<CurrencyData | null>(null);
    const [_isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);

    const [flatHistoricalRates, setFlatHistoricalRates] = useState<
        HistoricalRateEntry[]
    >([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<{
        key: "date" | "currencyLabelKey";
        direction: "asc" | "desc";
    }>({ key: "date", direction: "desc" });

    const [currencyFilters, setCurrencyFilters] = useState({
        usdBlue: true,
        usdOficial: true,
        eur: true,
    });

    const _tableRef = useRef<HTMLTableElement | null>(null);

    const fetchCurrencyData = useCallback(async () => {
        if (!selectedDate || !isValid(selectedDate)) {
            toast({
                title: t("toastNoValidDateTitle"),
                description: t("toastNoValidDateDescription"),
                variant: "destructive",
                duration: 3000,
            });
            return;
        }

        try {
            setIsLoading(true);
            setCurrencyData(null);

            const formattedDateForStorage = format(selectedDate, "yyyy-MM-dd");
            const formattedDateForPath = format(selectedDate, "yyyy/MM/dd");
            const { year, month, day } = {
                year: format(selectedDate, "yyyy"),
                month: format(selectedDate, "MM"),
                day: format(selectedDate, "dd"),
            };

            let usdBlueValues: UsdQuote | null = null;
            let usdOficialValues: UsdQuote | null = null;
            let eurValues: UsdQuote | null = null;
            const errors: string[] = [];

            try {
                const usdBlueResponse = await fetch(
                    `https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/${formattedDateForPath}`
                );
                if (usdBlueResponse.ok) {
                    const data = await usdBlueResponse.json();
                    if (
                        data &&
                        typeof data.compra === "number" &&
                        typeof data.venta === "number"
                    ) {
                        usdBlueValues = {
                            compra: data.compra,
                            venta: data.venta,
                        };
                    } else {
                        errors.push(
                            t("noExchangeRateDataSpecific", {
                                currency: t("usdBlueLabel"),
                                date: format(selectedDate, "P", {
                                    locale: dateLocale,
                                }),
                            })
                        );
                    }
                } else {
                    let errorMsg = `USD (Blue) API Error (${format(
                        selectedDate,
                        "P",
                        { locale: dateLocale }
                    )}): ${usdBlueResponse.status} ${usdBlueResponse.statusText || "Failed to fetch"
                        }`;
                    try {
                        const errorJson = await usdBlueResponse.json();
                        if (errorJson.error)
                            errorMsg = `USD (Blue) API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.error}`;
                        else if (errorJson.message)
                            errorMsg = `USD (Blue) API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.message}`;
                    } catch { }
                    errors.push(errorMsg);
                }
            } catch (error: unknown) {
                errors.push(
                    `USD (Blue) API Fetch Error (${format(selectedDate, "P", {
                        locale: dateLocale,
                    })}): ${error instanceof Error ? error.message : "Network error"}`
                );
            }

            try {
                const usdOficialResponse = await fetch(
                    `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${formattedDateForPath}`
                );
                if (usdOficialResponse.ok) {
                    const data = await usdOficialResponse.json();
                    if (
                        data &&
                        typeof data.compra === "number" &&
                        typeof data.venta === "number"
                    ) {
                        usdOficialValues = {
                            compra: data.compra,
                            venta: data.venta,
                        };
                    } else {
                        errors.push(
                            t("noExchangeRateDataSpecific", {
                                currency: t("usdOficialLabel"),
                                date: format(selectedDate, "P", {
                                    locale: dateLocale,
                                }),
                            })
                        );
                    }
                } else {
                    let errorMsg = `USD (Oficial) API Error (${format(
                        selectedDate,
                        "P",
                        { locale: dateLocale }
                    )}): ${usdOficialResponse.status} ${usdOficialResponse.statusText || "Failed to fetch"
                        }`;
                    try {
                        const errorJson = await usdOficialResponse.json();
                        if (errorJson.error)
                            errorMsg = `USD (Oficial) API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.error}`;
                        else if (errorJson.message)
                            errorMsg = `USD (Oficial) API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.message}`;
                    } catch { }
                    errors.push(errorMsg);
                }
            } catch (error: unknown) {
                errors.push(
                    `USD (Oficial) API Fetch Error (${format(
                        selectedDate,
                        "P",
                        { locale: dateLocale }
                    )}): ${error instanceof Error ? error.message : "Network error"}`
                );
            }

            try {
                const eurResponse = await fetch(
                    `https://api.argentinadatos.com/v1/cotizaciones/eur/${year}/${month}/${day}`
                );
                if (eurResponse.ok) {
                    const data = await eurResponse.json();
                    if (
                        data &&
                        typeof data.compra === "number" &&
                        typeof data.venta === "number"
                    ) {
                        eurValues = { compra: data.compra, venta: data.venta };
                    } else {
                        errors.push(
                            t("noExchangeRateDataSpecific", {
                                currency: t("eurLabel"),
                                date: format(selectedDate, "P", {
                                    locale: dateLocale,
                                }),
                            })
                        );
                    }
                } else {
                    let errorMsg = `EUR API Error (${format(selectedDate, "P", {
                        locale: dateLocale,
                    })}): ${eurResponse.status} ${eurResponse.statusText || "Failed to fetch"
                        }`;
                    try {
                        const errorJson = await eurResponse.json();
                        if (errorJson.error)
                            errorMsg = `EUR API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.error}`;
                        else if (errorJson.message)
                            errorMsg = `EUR API Error (${format(
                                selectedDate,
                                "P",
                                { locale: dateLocale }
                            )}): ${errorJson.message}`;
                    } catch { }
                    errors.push(errorMsg);
                }
            } catch (error: unknown) {
                errors.push(
                    `EUR API Fetch Error (${format(selectedDate, "P", {
                        locale: dateLocale,
                    })}): ${error instanceof Error ? error.message : "Network error"}`
                );
            }

            if (
                errors.length > 0 &&
                !usdBlueValues &&
                !usdOficialValues &&
                !eurValues
            ) {
                toast({
                    title: t("apiErrorsTitle"),
                    description: (
                        <div className="max-h-40 overflow-y-auto">
                            {errors.map((e) => (
                                <p key={`error-${e.slice(0, 20)}`}>
                                    {t("apiErrorsDescriptionItem", {
                                        error: e,
                                    })}
                                </p>
                            ))}
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
                quoteDate:
                    usdBlueValues || usdOficialValues || eurValues
                        ? formattedDateForStorage
                        : null,
            };
            setCurrencyData(newCurrencyData);

            const modalDialogTitle = t("modalTitle");
            const displayDate = newCurrencyData.quoteDate
                ? format(
                    parse(
                        newCurrencyData.quoteDate,
                        "yyyy-MM-dd",
                        new Date()
                    ),
                    "PPP",
                    { locale: dateLocale }
                )
                : selectedDate
                    ? format(selectedDate, "PPP", { locale: dateLocale })
                    : t("selectedDateFallback");
            const modalDescription = (
                <div className="space-y-4">
                    {newCurrencyData.USD_BLUE && newCurrencyData.quoteDate ? (
                        <CurrencyBg
                            currencyType="usdBlueLabel"
                            className="p-3 rounded-lg"
                        >
                            <p className="flex items-start text-lg font-semibold text-primary mb-1">
                                <DollarSign className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-primary" />
                                <span>
                                    {t("usdBlueLabel")}{" "}
                                    {t("modalRatesPreambleText")}:
                                    <br />
                                    {displayDate}
                                </span>
                            </p>                            <div className="grid grid-cols-2 gap-2 ml-7">
                                {newCurrencyData.USD_BLUE.compra !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("compraShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.USD_BLUE.compra.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                                {newCurrencyData.USD_BLUE.venta !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("ventaShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.USD_BLUE.venta.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                            </div>
                            {newCurrencyData.USD_BLUE.compra === null &&
                                newCurrencyData.USD_BLUE.venta === null && (
                                    <p className="ml-7 text-sm text-muted-foreground">
                                        {t("dataNotAvailableOnDate", {
                                            currency: t("usdBlueLabel"),
                                        })}
                                    </p>
                                )}
                        </CurrencyBg>
                    ) : (
                        <p className="flex items-center text-muted-foreground">
                            <DollarSign className="w-5 h-5 mr-2" />{" "}
                            {t("dataNotAvailableOnDate", {
                                currency: t("usdBlueLabel"),
                            })}
                        </p>
                    )}
                    {newCurrencyData.USD_OFICIAL &&
                        newCurrencyData.quoteDate ? (
                        <CurrencyBg
                            currencyType="usdOficialLabel"
                            className="p-3 rounded-lg"
                        >
                            <p className="flex items-start text-lg font-semibold text-primary mb-1">
                                <DollarSign className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-primary" />
                                <span>
                                    {t("usdOficialLabel")}{" "}
                                    {t("modalRatesPreambleText")}:
                                    <br />
                                    {displayDate}
                                </span>
                            </p>                            <div className="grid grid-cols-2 gap-2 ml-7">
                                {newCurrencyData.USD_OFICIAL.compra !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("compraShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.USD_OFICIAL.compra.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                                {newCurrencyData.USD_OFICIAL.venta !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("ventaShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.USD_OFICIAL.venta.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                            </div>
                            {newCurrencyData.USD_OFICIAL.compra === null &&
                                newCurrencyData.USD_OFICIAL.venta === null && (
                                    <p className="ml-7 text-sm text-muted-foreground">
                                        {t("dataNotAvailableOnDate", {
                                            currency: t("usdOficialLabel"),
                                        })}
                                    </p>
                                )}
                        </CurrencyBg>
                    ) : (
                        <p className="flex items-center text-muted-foreground">
                            <DollarSign className="w-5 h-5 mr-2" />{" "}
                            {t("dataNotAvailableOnDate", {
                                currency: t("usdOficialLabel"),
                            })}
                        </p>
                    )}{" "}
                    {newCurrencyData.EUR && newCurrencyData.quoteDate ? (
                        <CurrencyBg
                            currencyType="eurLabel"
                            className="p-3 rounded-lg"
                        >
                            <p className="flex items-start text-lg font-semibold text-primary mb-1">
                                <Euro className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-primary" />
                                <span>
                                    {t("eurLabel")}{" "}
                                    {t("modalRatesPreambleText")}:
                                    <br />
                                    {displayDate}
                                </span>
                            </p>                            <div className="grid grid-cols-2 gap-2 ml-7">
                                {newCurrencyData.EUR.compra !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("compraShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.EUR.compra.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                                {newCurrencyData.EUR.venta !== null && (
                                    <>
                                        <div className="text-md text-left font-medium">
                                            {t("ventaShort")}:
                                        </div>
                                        <div className="text-md text-right font-medium font-mono">
                                            {newCurrencyData.EUR.venta.toFixed(2)} ARS
                                        </div>
                                    </>
                                )}
                            </div>
                            {newCurrencyData.EUR.compra === null &&
                                newCurrencyData.EUR.venta === null && (
                                    <p className="ml-7 text-sm text-muted-foreground">
                                        {t("dataNotAvailableOnDate", {
                                            currency: t("eurLabel"),
                                        })}
                                    </p>
                                )}
                        </CurrencyBg>
                    ) : (
                        <p className="flex items-center text-muted-foreground">
                            <Euro className="w-5 h-5 mr-2" />{" "}
                            {t("dataNotAvailableOnDate", {
                                currency: t("eurLabel"),
                            })}
                        </p>
                    )}
                    {errors.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border">
                            <p className="font-medium text-destructive text-sm">
                                {t("apiErrorsTitle")}:
                            </p>
                            <ul className="list-disc list-inside text-destructive text-xs max-h-20 overflow-y-auto">
                                {errors.map((e, i) => (
                                    <li key={i}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!newCurrencyData.USD_BLUE &&
                        !newCurrencyData.USD_OFICIAL &&
                        !newCurrencyData.EUR &&
                        errors.length === 0 && (
                            <p className="text-destructive font-medium">
                                {t("noExchangeRateDataGeneric", {
                                    date: displayDate,
                                })}
                            </p>
                        )}
                </div>
            );

            setModalContent({
                title: modalDialogTitle,
                description: modalDescription,
            });
            setIsModalOpen(true);
        } catch (error: unknown) {
            console.error("Critical error in fetchCurrencyData:", error);
            setModalContent({
                title: t("criticalErrorTitle"),
                description: (
                    <p className="text-destructive font-medium">
                        {error instanceof Error 
                            ? error.message 
                            : "An unexpected critical error occurred."}
                    </p>
                ),
            });
            setIsModalOpen(true);
            setCurrencyData({
                USD_BLUE: null,
                USD_OFICIAL: null,
                EUR: null,
                quoteDate: null,
            });
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    const currentYr = new Date().getFullYear();
    const years = Array.from(
        { length: currentYr - MIN_DATE.getFullYear() + 1 },
        (_, i) => currentYr - i
    );

    const handleYearChange = (yearStr: string) => {
        const newYear = parseInt(yearStr);
        const currentDisplayMonth = calendarMonth.getMonth();

        let newCalendarFocusDate = startOfMonth(
            new Date(newYear, currentDisplayMonth, 1)
        );

        if (newCalendarFocusDate.getFullYear() > new Date().getFullYear()) {
            newCalendarFocusDate = startOfMonth(
                new Date(new Date().getFullYear(), currentDisplayMonth, 1)
            );
            toast({
                title: t("toastInvalidYearTitle"),
                description: t("toastInvalidYearDescriptionFuture"),
                variant: "destructive",
                duration: 3000,
            });
        } else if (newCalendarFocusDate < MIN_CALENDAR_MONTH) {
            newCalendarFocusDate = MIN_CALENDAR_MONTH;
            toast({
                title: t("toastInvalidYearTitle"),
                description: t("toastInvalidYearDescriptionPast", {
                    year: format(MIN_DATE, "yyyy"),
                }),
                variant: "destructive",
                duration: 3000,
            });
        }
        setCalendarMonth(newCalendarFocusDate);
    };

    const handleMonthChange = (monthStr: string) => {
        const newMonth = parseInt(monthStr);
        const currentDisplayYear = calendarMonth.getFullYear();

        let newCalendarFocusDate = startOfMonth(
            new Date(currentDisplayYear, newMonth, 1)
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newCalendarFocusDate > startOfMonth(today)) {
            newCalendarFocusDate = startOfMonth(today);
            toast({
                title: t("toastInvalidMonthTitle"),
                description: t("toastInvalidMonthDescriptionFuture"),
                variant: "destructive",
                duration: 3000,
            });
        } else if (newCalendarFocusDate < MIN_CALENDAR_MONTH) {
            newCalendarFocusDate = MIN_CALENDAR_MONTH;
            toast({
                title: t("toastInvalidMonthTitle"),
                description: t("toastInvalidMonthDescriptionPast", {
                    monthYear: format(MIN_DATE, "MMMM yyyy", {
                        locale: dateLocale,
                    }),
                }),
                variant: "destructive",
                duration: 3000,
            });
        }
        setCalendarMonth(newCalendarFocusDate);
    };

    const handleCalendarDaySelect = (date: Date | undefined) => {
        if (date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (date > today) {
                toast({
                    title: t("toastInvalidDateTitle"),
                    description: t("toastInvalidDateDescriptionFuture"),
                    variant: "destructive",
                    duration: 3000,
                });
                return;
            }
            if (date < MIN_DATE) {
                toast({
                    title: t("toastInvalidDateTitle"),
                    description: t("toastInvalidDateDescriptionPast", {
                        date: format(MIN_DATE, "P", { locale: dateLocale }),
                    }),
                    variant: "destructive",
                    duration: 3000,
                });
                return;
            }
            setSelectedDate(date);
        } else {
            setSelectedDate(undefined);
            setCurrencyData(null);
        }
    };

    const localizedMonths = useMemo(
        () =>
            Array.from({ length: 12 }, (_, i) => ({
                value: i.toString(),
                label: format(new Date(2000, i, 1), "MMMM", {
                    locale: dateLocale,
                }),
            })),
        [dateLocale]
    );

    const fetchHistoricalData = useCallback(async () => {
        setIsHistoryLoading(true);
        const historicalRates: HistoricalRateEntry[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let currentDateIter = subDays(today, 1);
        const targetDays = 10;
        const attemptedDates: string[] = [];

        const currencyConfigs: {
            labelKey: CurrencyLabelKey;
            path: string;
            isEuro?: boolean;
        }[] = [
                { labelKey: "usdBlueLabel", path: "dolares/blue" },
                { labelKey: "usdOficialLabel", path: "dolares/oficial" },
                { labelKey: "eurLabel", path: "eur", isEuro: true },
            ];

        while (
            attemptedDates.length < targetDays &&
            currentDateIter >= MIN_DATE
        ) {
            if (!isWeekend(currentDateIter)) {
                attemptedDates.push(format(currentDateIter, "yyyy-MM-dd"));

                const datePath = format(currentDateIter, "yyyy/MM/dd");
                const dateStr = format(currentDateIter, "yyyy-MM-dd");

                for (const config of currencyConfigs) {
                    try {
                        const { year, month, day } = {
                            year: format(currentDateIter, "yyyy"),
                            month: format(currentDateIter, "MM"),
                            day: format(currentDateIter, "dd"),
                        };
                        const apiUrl = config.isEuro
                            ? `https://api.argentinadatos.com/v1/cotizaciones/${config.path}/${year}/${month}/${day}`
                            : `https://api.argentinadatos.com/v1/cotizaciones/${config.path}/${datePath}`;

                        const response = await fetch(apiUrl);
                        if (response.ok) {
                            const data = await response.json();
                            historicalRates.push({
                                id: `${dateStr}-${config.labelKey}`,
                                date: dateStr,
                                currencyLabelKey: config.labelKey,
                                buy:
                                    typeof data.compra === "number"
                                        ? data.compra
                                        : null,
                                sell:
                                    typeof data.venta === "number"
                                        ? data.venta
                                        : null,
                            });
                        } else {
                            historicalRates.push({
                                id: `${dateStr}-${config.labelKey}`,
                                date: dateStr,
                                currencyLabelKey: config.labelKey,
                                buy: null,
                                sell: null,
                            });
                        }
                    } catch {
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
            currentDateIter = subDays(currentDateIter, 1);
        }

        historicalRates.sort((a, b) => {
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            return (
                (currencyOrder[a.currencyLabelKey] || 99) -
                (currencyOrder[b.currencyLabelKey] || 99)
            );
        });

        setFlatHistoricalRates(historicalRates);
        setIsHistoryLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t, dateLocale]);

    useEffect(() => {
        fetchHistoricalData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSort = (columnKey: "date" | "currencyLabelKey") => {
        setSortConfig((currentSortConfig) => {
            let newDirection: "asc" | "desc" = "asc";
            if (currentSortConfig.key === columnKey) {
                newDirection =
                    currentSortConfig.direction === "asc" ? "desc" : "asc";
            } else {
                if (columnKey === "date") newDirection = "desc";
                else if (columnKey === "currencyLabelKey") newDirection = "asc";
            }

            // Aplicar efecto visual y scrollear al principio
            setTableSortEffect(true);

            // Activar animación de botón
            setActiveButton(columnKey);
            setTimeout(() => {
                if (historyTableRef.current) {
                    historyTableRef.current.scrollTop = 0;
                }
                // Desactivar efecto después de un breve retraso
                setTimeout(() => {
                    setTableSortEffect(false);
                    setActiveButton(null);
                }, 500);
            }, 0);

            return { key: columnKey, direction: newDirection };
        });
    };

    // Función para calcular retraso de animación según la posición en la lista
    const getAnimationDelay = (index: number): string => {
        // Cada fila tiene un retraso un poco mayor que la anterior
        return `${index * 30}ms`;
    };

    const sortedHistoricalRates = useMemo(() => {
        if (!flatHistoricalRates) return [];
        
        // First filter by currency selection
        const filteredRates = flatHistoricalRates.filter((rate) => {
            switch (rate.currencyLabelKey) {
                case "usdBlueLabel":
                    return currencyFilters.usdBlue;
                case "usdOficialLabel":
                    return currencyFilters.usdOficial;
                case "eurLabel":
                    return currencyFilters.eur;
                default:
                    return true;
            }
        });

        const sortableRates = [...filteredRates];

        if (sortConfig.key === "date") {
            sortableRates.sort((a, b) => {
                const dateA = parseISO(a.date).getTime();
                const dateB = parseISO(b.date).getTime();
                const primarySort =
                    sortConfig.direction === "asc"
                        ? dateA - dateB
                        : dateB - dateA;
                if (primarySort !== 0) return primarySort;
                return (
                    (currencyOrder[a.currencyLabelKey] || 99) -
                    (currencyOrder[b.currencyLabelKey] || 99)
                );
            });
        } else if (sortConfig.key === "currencyLabelKey") {
            sortableRates.sort((a, b) => {
                const orderA = currencyOrder[a.currencyLabelKey] || 99;
                const orderB = currencyOrder[b.currencyLabelKey] || 99;

                let currencyComparison: number;
                if (sortConfig.direction === "asc") {
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
    }, [flatHistoricalRates, sortConfig, currencyFilters]);

    return (
        <div className="dolar-background desktop-full-height flex flex-col min-h-screen bg-background text-foreground">
            <main className="desktop-content-distributed container mx-auto p-4 sm:p-6 md:p-8 flex flex-col items-center flex-grow">
                <div className="w-full max-w-6xl desktop-main-content">
                    <header className="header-overlay mb-6 sm:mb-10 lg:mb-6 text-center w-full">
                        <div className="flex justify-center sm:justify-end w-full mb-2 sm:mb-0 sm:absolute sm:top-4 sm:right-4 md:top-6 md:right-6">
                            <div className="language-switcher-overlay">
                                <LanguageSwitcher />
                            </div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary mt-4 sm:mt-0">
                            {t("headerTitle")}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-lg mx-auto">
                            {t("headerSubtitle1")}
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 max-w-lg mx-auto">
                            {t("headerSubtitle2")}
                        </p>
                    </header>

                    <div className="desktop-cards-container w-full grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 desktop-grid">
                    <Card className="content-overlay desktop-card shadow-lg rounded-xl border-border lg:col-span-1">
                        <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
                            <CardTitle className="flex items-center justify-center text-lg sm:text-xl text-center">
                                <CalendarIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                {t("selectDateCardTitle")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="desktop-card-content p-4 sm:p-6">
                            <div className="mx-auto w-full max-w-[276px] sm:max-w-none sm:w-[278px]">
                                <div className="flex flex-row gap-2 mb-4">
                                    <Select
                                        value={calendarMonth
                                            .getFullYear()
                                            .toString()}
                                        onValueChange={handleYearChange}
                                    >
                                        <SelectTrigger className="w-[calc(50%_-_theme(space.1))] sm:w-[120px]">
                                            <SelectValue
                                                placeholder={t(
                                                    "yearSelectPlaceholder"
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((year) => (
                                                <SelectItem
                                                    key={year}
                                                    value={year.toString()}
                                                >
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={calendarMonth
                                            .getMonth()
                                            .toString()}
                                        onValueChange={handleMonthChange}
                                    >
                                        <SelectTrigger className="w-[calc(50%_-_theme(space.1))] sm:w-[150px]">
                                            <SelectValue
                                                placeholder={t(
                                                    "monthSelectPlaceholder"
                                                )}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {localizedMonths.map((month) => (
                                                <SelectItem
                                                    key={month.value}
                                                    value={month.value}
                                                >
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
                                    className="rounded-md border shadow-sm bg-card w-auto mx-auto sm:w-full sm:mx-0"
                                    classNames={{
                                        caption:
                                            "hidden sm:flex justify-center pt-1 relative items-center",
                                        nav: "hidden sm:flex space-x-1 items-center",
                                    }}
                                    disabled={(date) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return date > today || date < MIN_DATE;
                                    }}
                                    initialFocus
                                    locale={dateLocale}
                                    footer={
                                        <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2 p-1">
                                            {selectedDate
                                                ? t("calendarFooterWithDate", {
                                                    date: format(
                                                        selectedDate,
                                                        "PPP",
                                                        { locale: dateLocale }
                                                    ),
                                                })
                                                : t("calendarFooterNoDate")}
                                        </p>
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="content-overlay desktop-card shadow-lg rounded-xl border-border lg:col-span-2">
                        <CardHeader className="bg-card-foreground/[.03] p-4 sm:p-6">
                            <CardTitle className="flex items-center justify-center text-lg sm:text-xl">
                                <History className="mr-2 h-5 w-5 sm:h-6 sm:w-6 text-primary" />{" "}
                                {t("historyCardTitle")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="desktop-card-content p-4 sm:p-6">
                            <div className="mb-4 p-3 bg-card-foreground/[.03] rounded-lg border border-border">
                                <div className="text-sm font-medium text-foreground mb-3">
                                    {t("filterLabel")}
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="filter-usd-blue"
                                            checked={currencyFilters.usdBlue}
                                            onCheckedChange={(checked) =>
                                                setCurrencyFilters(prev => ({
                                                    ...prev,
                                                    usdBlue: checked === true
                                                }))
                                            }
                                        />
                                        <label
                                            htmlFor="filter-usd-blue"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {t("filterUsdBlue")}
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="filter-usd-oficial"
                                            checked={currencyFilters.usdOficial}
                                            onCheckedChange={(checked) =>
                                                setCurrencyFilters(prev => ({
                                                    ...prev,
                                                    usdOficial: checked === true
                                                }))
                                            }
                                        />
                                        <label
                                            htmlFor="filter-usd-oficial"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {t("filterUsdOficial")}
                                        </label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="filter-eur"
                                            checked={currencyFilters.eur}
                                            onCheckedChange={(checked) =>
                                                setCurrencyFilters(prev => ({
                                                    ...prev,
                                                    eur: checked === true
                                                }))
                                            }
                                        />
                                        <label
                                            htmlFor="filter-eur"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {t("filterEur")}
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center border-b pb-2 mb-2 text-xs font-medium text-muted-foreground">
                                {" "}
                                <div className="w-[35%] px-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort("date")}
                                        className={`p-0 h-auto hover:bg-transparent text-xs font-medium ${activeButton === "date"
                                                ? "sort-button-active"
                                                : "text-muted-foreground hover:text-primary"
                                            }`}
                                    >
                                        {t("historyTableDate")}
                                        {sortConfig.key === "date" &&
                                            (sortConfig.direction === "asc" ? (
                                                <ArrowUp className="ml-1 h-3 w-3 inline" />
                                            ) : (
                                                <ArrowDown className="ml-1 h-3 w-3 inline" />
                                            ))}
                                        {sortConfig.key !== "date" && (
                                            <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />
                                        )}
                                    </Button>
                                </div>{" "}
                                <div className="w-[30%] px-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() =>
                                            handleSort("currencyLabelKey")
                                        }
                                        className={`p-0 h-auto hover:bg-transparent text-xs font-medium ${activeButton === "currencyLabelKey"
                                                ? "sort-button-active"
                                                : "text-muted-foreground hover:text-primary"
                                            }`}
                                    >
                                        {t("historyTableCurrency")}
                                        {sortConfig.key ===
                                            "currencyLabelKey" &&
                                            (sortConfig.direction === "asc" ? (
                                                <ArrowUp className="ml-1 h-3 w-3 inline" />
                                            ) : (
                                                <ArrowDown className="ml-1 h-3 w-3 inline" />
                                            ))}
                                        {sortConfig.key !==
                                            "currencyLabelKey" && (
                                                <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />
                                            )}
                                    </Button>
                                </div>
                                <div className="w-[17.5%] text-center px-2">
                                    {t("historyTableBuy")}
                                </div>
                                <div className="w-[17.5%] text-center px-2">
                                    {t("historyTableSell")}
                                </div>
                            </div>
                            {isHistoryLoading ? (
                                <div className="flex flex-col items-center justify-center min-h-[calc(400px_-_theme(spacing.10))]">
                                    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
                                    <p className="text-sm sm:text-base text-muted-foreground">
                                        {t("historyLoadingText")}
                                    </p>
                                </div>
                            ) : sortedHistoricalRates.length > 0 ? (
                                <div
                                    ref={historyTableRef}
                                    className={`max-h-[calc(400px_-_theme(spacing.10))] overflow-y-auto overflow-x-auto px-0.5 smooth-scroll ${tableSortEffect
                                            ? "table-sort-flash"
                                            : ""
                                        }`}
                                >
                                    <Table className="border-separate border-spacing-y-1">
                                        <TableBody>
                                            {sortedHistoricalRates.map(
                                                (entry, index) => (
                                                    <TableRow
                                                        key={entry.id}
                                                        className={`p-0 border-b-0 ${tableSortEffect
                                                                ? "table-row-animated"
                                                                : ""
                                                            }`}
                                                        style={{
                                                            animationDelay:
                                                                getAnimationDelay(
                                                                    index
                                                                ),
                                                        }}
                                                    >
                                                        <TableCell
                                                            colSpan={4}
                                                            className="p-0 py-1"
                                                        >
                                                            {" "}
                                                            <CurrencyBg
                                                                currencyType={
                                                                    entry.currencyLabelKey
                                                                }
                                                                className="flex flex-row items-center rounded-lg py-2"
                                                            >
                                                                <div className="text-xs p-2 pl-3 whitespace-nowrap w-[35%]">
                                                                    {format(
                                                                        parseISO(
                                                                            entry.date
                                                                        ),
                                                                        "EEEE, dd/MM",
                                                                        {
                                                                            locale: dateLocale,
                                                                        }
                                                                    )}
                                                                </div>
                                                                <div className="text-xs p-2 w-[30%] font-medium">
                                                                    {t(
                                                                        entry.currencyLabelKey
                                                                    )}
                                                                </div>
                                                                <div className="text-right text-xs p-2 w-[17.5%] font-mono">
                                                                    {entry.buy !==
                                                                        null
                                                                        ? entry.buy.toFixed(
                                                                            2
                                                                        )
                                                                        : "N/A"}
                                                                </div>
                                                                <div className="text-right text-xs px-3 py-2 w-[17.5%] font-mono">
                                                                    {entry.sell !==
                                                                        null
                                                                        ? entry.sell.toFixed(
                                                                            2
                                                                        )
                                                                        : "N/A"}
                                                                </div>
                                                            </CurrencyBg>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="text-xs text-muted-foreground text-center mt-2">
                                        <p>{t("historySortInfoText")}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center min-h-[calc(400px_-_theme(spacing.10))]">
                                    <p className="text-sm sm:text-base text-muted-foreground">
                                        {t("historyNoDataText")}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <footer className="footer-overlay text-center p-4 lg:p-2 text-xs text-muted-foreground border-t border-border mt-6 sm:mt-8 lg:mt-4">
                    {t("footerCopyrightText", { year: new Date().getFullYear() })}
                </footer>
                </div>

                {modalContent && (
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="w-[calc(100%_-_2rem)] max-w-lg sm:w-full sm:max-w-md bg-card text-card-foreground rounded-xl shadow-xl border-border px-4 sm:px-6">
                            <DialogHeader className="p-6 pb-4 border-b border-border">
                                <DialogTitle className="text-xl sm:text-2xl text-primary">
                                    {modalContent.title}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="p-6 text-base leading-relaxed">
                                {modalContent.description}
                            </div>
                            <DialogFooter className="p-6 pt-4 border-t border-border">
                                <Button
                                    onClick={() => setIsModalOpen(false)}
                                    variant="default"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
                                >
                                    {t("modalCloseButton")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </main>
        </div>
    );
}

export default function PesoWatcherPage() {
    return (
        <Suspense fallback={<PageLoading />}>
            <PesoWatcherPageContent />
        </Suspense>
    );
}
