import { lazy } from 'react'

/*
 * Recharts is loaded on demand. Plots only render after hydration anyway (they
 * measure the DOM), so splitting them out keeps the chart library off the
 * critical path; ChartCard shows a same-height skeleton while the chunk loads.
 */
const load = () => import('./plots')

export const ColumnPlot = lazy(() => load().then((m) => ({ default: m.ColumnPlot })))
export const LinePlot = lazy(() => load().then((m) => ({ default: m.LinePlot })))
export const HBarPlot = lazy(() => load().then((m) => ({ default: m.HBarPlot })))
