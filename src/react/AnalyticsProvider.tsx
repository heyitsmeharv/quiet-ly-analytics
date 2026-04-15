import React, { createContext, useContext, useMemo } from 'react'
import { Analytics, AnalyticsConfig } from '../core/Analytics'

interface AnalyticsContextValue {
  analytics: Analytics
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export interface AnalyticsProviderProps {
  config: AnalyticsConfig
  children: React.ReactNode
}

export function AnalyticsProvider({ config, children }: AnalyticsProviderProps) {
  const { endpoint, appId, debug } = config
  const analytics = useMemo(
    () => new Analytics({ endpoint, appId, debug }),
    [endpoint, appId, debug],
  )

  return (
    <AnalyticsContext.Provider value={{ analytics }}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) {
    throw new Error('useAnalytics must be used inside <AnalyticsProvider>')
  }
  return ctx
}
