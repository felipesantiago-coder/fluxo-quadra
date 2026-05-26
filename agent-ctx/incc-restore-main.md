# INCC Functionality Restoration - Work Log

## Date: 2025-07-13
## Task ID: incc-restore

## Objective
Restore full INCC (Índice Nacional de Custo da Construção) correction functionality to 3 simulator files that had the code accidentally removed.

## Files Modified

### 1. `/src/app/simulador/page.tsx` (Quattre - Torre Istambul)

**Changes made:**
- **A. Import**: Added `TrendingUp` to lucide-react imports
- **B. Types**: Added `InccMode` type (`"none" | "180m" | "12m" | "projection"`) and `InccData` interface after existing `InstallmentRow`
- **C. CalculationResult**: Extended with 8 new fields: `inccMonthlyRate`, `inccCorrectionFactor`, `inccAccumulatedPercent`, `inccMode`, `habiteseCorrected`, `mRemainingCorrected`, `sRemainingCorrected`, `hBalanceCorrected`
- **D. State**: Added `inccMode` (InccMode) and `inccData` (InccData) useState hooks
- **E. Helper**: Added `getInccMonthlyRate()` function and `inccMonthlyRate` computed value
- **F. useMemo**: Rewrote calculation to include INCC factor on each monthly/semester parcel (`inccFactor(i) = Math.pow(1 + rate/100, i)`), split paid vs remaining with INCC correction, compute `habiteseCorrected = mRemainingCorrected + sRemainingCorrected + hBalance * inccCorrectionFactor`. Added `inccMonthlyRate` and `inccMode` to dependency array.
- **G. Fetch useEffect**: Added `/api/incc` fetch on mount
- **H. clearAll**: Added `setInccMode("none")` reset
- **I. generatePDF deps**: Added `inccMode`, `inccMonthlyRate`, `downPaymentDate` to dependency array
- **J. PDF - Summary table**: Added conditional "Habite-se (corrigido INCC)" row
- **K. PDF - INCC section**: Added "Correção INCC" autoTable after habite-se details with monthly rate, period, accumulated %, original/corrected/impact values
- **L. UI - INCC Selector**: Added collapsible INCC radio button group (180m/12m/projection) with toggle button, placed after Max Semester select and before Low captation warning
- **M. UI - Results table**: Added conditional amber-highlighted "Habite-se (corrigido INCC)" row after standard habite-se row
- **N. UI - Summary card**: Added amber-tinted INCC correction info block after captation progress bar
- **O. UI - Habite-se tab**: Added corrected habite-se display in the habitese schedule tab

### 2. `/src/app/simulador-moment/page.tsx` (Moment)

**Changes made:**
- **A. Import**: Added `TrendingUp` to lucide-react imports
- **B. Types**: Added `InccMode`, `InccData` types/interfaces
- **C. CalculationResult**: Extended with `inccMonthlyRate`, `inccCorrectionFactor`, `inccAccumulatedPercent`, `inccMode`, `habiteseCorrected`
- **D. State**: Added `inccMode` and `inccData` useState hooks
- **E. Helper**: Added `getInccMonthlyRate()` and `inccMonthlyRate`
- **F. useMemo**: Added INCC correction factor calculation (`Math.pow(1 + rate/100, totalMonths)`) and `habiteseCorrected = habitese * inccCorrectionFactor`. Added deps `inccMonthlyRate`, `inccMode`
- **G. Fetch useEffect**: Added `/api/incc` fetch
- **H. clearAll**: Added `setInccMode("none")`
- **I. generatePDF deps**: Added `inccMode`, `inccMonthlyRate`
- **J. PDF - Summary table**: Added conditional INCC corrected row
- **K. PDF - INCC section**: Added "Correção INCC" autoTable
- **L. UI - INCC Selector**: Added after decoration fee display, before low captation warning
- **M. UI - Results table**: Added conditional INCC corrected habite-se row
- **N. UI - Summary card**: Added INCC correction info block
- **O. UI - Habite-se tab**: Added corrected habite-se display with INCC details

### 3. `/src/app/simulador-villa-bianco/page.tsx` (Villa Bianco)

**Changes made:**
- **A. Import**: Added `TrendingUp` to lucide-react imports
- **B. Types**: Added `InccMode`, `InccData` types/interfaces
- **C. CalculationResult**: Extended with `inccMonthlyRate`, `inccCorrectionFactor`, `inccAccumulatedPercent`, `inccMode`, `habiteseCorrected`
- **D. State**: Added `inccMode` and `inccData` useState hooks
- **E. Helper**: Added `getInccMonthlyRate()` and `inccMonthlyRate`
- **F. useMemo**: Added INCC correction factor and `habiteseCorrected`. Added deps `inccMonthlyRate`, `inccMode`
- **G. Fetch useEffect**: Added `/api/incc` fetch
- **H. clearAll**: Added `setInccMode("none")`
- **I. generatePDF deps**: Added `inccMode`, `inccMonthlyRate`
- **J. PDF - Summary table**: Added conditional INCC corrected row
- **K. PDF - INCC section**: Added "Correção INCC" autoTable
- **L. UI - INCC Selector**: Added after decoration fee display, before low captation warning
- **M. UI - Results table**: Added conditional INCC corrected habite-se row
- **N. UI - Summary card**: Added INCC correction info block
- **O. UI - Habite-se tab**: Added corrected habite-se display with INCC details

## Verification
- `npm run build` ✅ — All routes compiled successfully
- `npm run lint` ✅ — No lint errors

## Key Differences Between Simulators
- **Quattre**: Has remaining/balance logic (mRemaining, sRemaining, hBalance) with INCC factor applied per-parcel. Each monthly parcel `i` gets `inccFactor(i)`, each semester parcel `i` gets `inccFactor(6*i)`. Corrected habite-se = sum of corrected remaining + corrected balance.
- **Moment/Villa Bianco**: All installments paid during construction (no remaining). INCC correction applies uniformly to entire habite-se: `habiteseCorrected = habitese * Math.pow(1 + rate/100, totalMonths)`.
