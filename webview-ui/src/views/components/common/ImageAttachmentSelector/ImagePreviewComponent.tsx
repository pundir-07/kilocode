import { ImageItem } from "@/common/types/context"
import * as React from "react"
import { useCallback, useEffect, useMemo } from "react"

type ImagePreviewComponentProps = {
  isOpen: boolean
  imageItem: ImageItem
  mimeType?: string
  alt?: string
  onClose: () => void
}

/**
 * Full-screen modal to preview an image from base64 data.
 * - Dimmed backdrop overlays the entire screen
 * - Close (X) button on the top-right
 * - Open button on the top-left (opens image in a new tab)
 */
export default function ImagePreviewComponent(props: ImagePreviewComponentProps) {
  const { isOpen, imageItem, mimeType = "image/png", alt = "Preview image", onClose } = props
  const base64Data = imageItem.url
  const dataUrl = useMemo(() => {
    if (!base64Data) return ""
    // If already a data URL, use as-is
    if (base64Data.startsWith("data:")) return base64Data
    return `data:${mimeType};base64,${base64Data}`
  }, [base64Data, mimeType])
  useEffect(() => {
    console.log("Image preview component rendered")
  }, [])
  useEffect(() => {
    console.log("Got base64 url = ", imageItem.url)
  }, [imageItem])
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Close only if clicking on the backdrop (not the image/content)
      if (event.currentTarget === event.target) {
        onClose()
      }
    },
    [onClose]
  )

  const handleOpenInVsCodeEditor = useCallback(() => {
    tsvscode.postMessage({
      type: "preview_image_file",
      value: {
        base64Data: imageItem.url,
        ext: ".png"
      }
    })
  }, [dataUrl])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  if (!isOpen || !dataUrl) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      {/* Top-left Open button */}
      <button
        type="button"
        onClick={handleOpenInVsCodeEditor}
        className="absolute left-4 top-4 rounded-md bg-white/90 px-3 py-1 text-sm font-medium text-gray-900 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Open
      </button>

      {/* Top-right Close (X) button */}
      <button
        type="button"
        aria-label="Close preview"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <path
            fillRule="evenodd"
            d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 1 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Image content */}
      <div className="mx-4 max-h-[90vh] max-w-[95vw] overflow-auto rounded-lg bg-black/10 p-2">
        <img
          src={dataUrl}
          alt={alt}
          className="max-h-[85vh] max-w-full select-none rounded object-contain shadow-2xl"
          draggable={false}
        />
      </div>
    </div>
  )
}


