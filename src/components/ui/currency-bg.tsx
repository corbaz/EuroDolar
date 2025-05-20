// Componente para proporcionar fondos de colores pastel a diferentes tipos de monedas
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CurrencyBgProps {
    currencyType: "usdBlueLabel" | "usdOficialLabel" | "eurLabel";
    children: ReactNode;
    className?: string;
}

// Objeto con las clases de color de fondo para cada tipo de moneda usando clases de Tailwind directas
const currencyBgClasses = {
    usdBlueLabel: "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400 shadow-sm",
    usdOficialLabel: "bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-400 shadow-sm",
    eurLabel: "bg-violet-50 hover:bg-violet-100 border-l-4 border-violet-400 shadow-sm",
};

export function CurrencyBg({
    currencyType,
    children,
    className,
}: Readonly<CurrencyBgProps>) {
    return (
        <div className={cn(currencyBgClasses[currencyType], className)}>
            {children}
        </div>
    );
}
