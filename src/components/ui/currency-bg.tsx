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
    usdBlueLabel:
        "bg-blue-100 hover:bg-blue-200 border-4 border-blue-400",
    usdOficialLabel:
        "bg-emerald-100 hover:bg-emerald-200 border-4 border-emerald-400",
    eurLabel:
        "bg-violet-100 hover:bg-violet-200 border-4 border-violet-400",
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
