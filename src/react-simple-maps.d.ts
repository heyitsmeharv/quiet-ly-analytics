declare module 'react-simple-maps' {
  import { ComponentType, ReactNode, SVGProps } from 'react'

  export interface Geography {
    rsmKey: string
    id: string | number
    properties?: Record<string, unknown>
    [key: string]: unknown
  }

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: { scale?: number; center?: [number, number]; [key: string]: unknown }
    style?: React.CSSProperties
    [key: string]: unknown
  }

  export interface GeographiesProps {
    geography: string | Record<string, unknown>
    children: (args: { geographies: Geography[] }) => ReactNode
    [key: string]: unknown
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: Geography
    style?: {
      default?: Record<string, unknown>
      hover?:   Record<string, unknown>
      pressed?: Record<string, unknown>
    }
    [key: string]: unknown
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies:   ComponentType<GeographiesProps>
  export const Geography:     ComponentType<GeographyProps>
}
