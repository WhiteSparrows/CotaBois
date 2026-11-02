/// <reference types="vite/client" />
import type { CotaboisApi } from '../preload'

declare global {
  interface Window {
    cotabois: CotaboisApi
  }
}
