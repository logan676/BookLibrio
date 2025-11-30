declare module 'page-flip' {
  export interface FlipSetting {
    width?: number
    height?: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    swipeDistance?: number
    clickEventForward?: boolean
    useMouseEvents?: boolean
    showPageCorners?: boolean
    disableFlipByClick?: boolean
    startPage?: number
  }

  export interface PageFlip {
    loadFromImages(images: string[]): void
    loadFromHTML(items: HTMLElement[]): void
    updateFromImages(images: string[]): void
    updateFromHTML(items: HTMLElement[]): void
    turnToPage(pageNum: number): void
    turnToNextPage(): void
    turnToPrevPage(): void
    flip(pageNum: number, corner?: string): void
    flipNext(corner?: string): void
    flipPrev(corner?: string): void
    getCurrentPageIndex(): number
    getPageCount(): number
    getOrientation(): string
    getBoundsRect(): DOMRect
    on(eventName: string, callback: (e: { data: number; object: PageFlip }) => void): PageFlip
    off(eventName: string): void
    destroy(): void
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings?: FlipSetting)
  }
}
