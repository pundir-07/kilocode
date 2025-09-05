import { API } from "@/common/api"
import { ImageItem } from "@/common/types/context"
import { setIsUploadingImage } from "@/views/lib/store/chatSlice"
import { Image, ImageIcon } from "lucide-react"
import { useRef } from "react"
import { useDispatch } from "react-redux"
import { MenuNode_t } from "../PromptEditor/types"

interface IFile {
   name: string // File name
   size: number // File size in bytes
   type: string // MIME type (e.g., "image/jpeg")
   lastModified: number // Last modified timestamp
   webkitRelativePath: string // Path (for directory uploads)
}

interface IImageAttachmentButtonProps {
   onAddImageItem: (item: MenuNode_t) => void
   onUpdateImageItem: (item: MenuNode_t) => void
   getContextItems: () => MenuNode_t[]
}

export default function ImageAttachmentButton({
   onAddImageItem,
   onUpdateImageItem,
   getContextItems,
}: IImageAttachmentButtonProps) {
   const fileInputRef = useRef(null)
   const dispatch = useDispatch()
   const convertToBase64 = (file) => {
      return new Promise((resolve, reject) => {
         const reader = new FileReader()
         reader.onload = () => resolve(reader.result)
         reader.onerror = (error) => reject(error)
         reader.readAsDataURL(file)
      })
   }

   const generateImageId = () => {
      return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
   }

   const handleImageImport = () => {
      fileInputRef.current?.click()
   }

   const handleFileChange = async (event) => {
      const files = Array.from(event.target.files) as IFile[]
      if (files.length === 0) return
      console.log("ImageFiles = ", files)
      try {
         // Process all files
         const imagePromises = files.map(async (file) => {
            // Validate file type
            if (!file.type.startsWith("image/")) {
               console.warn(`Skipping non-image file: ${file.name}`)
               return null
            }

            // Convert to base64
            const base64Url = await convertToBase64(file)

            // Create image object
            return {
               id: generateImageId(),
               name: file.name,
               url: base64Url,
            } as ImageItem
         })

         // Wait for all conversions to complete
         const imageObjects = await Promise.all(imagePromises)

         // Filter out null values (non-image files)
         const validImages = imageObjects.filter((img) => img !== null)

         validImages.forEach(async (imageObject) => {
            const imageItem: MenuNode_t = {
               id: "image",
               name: imageObject.name,
               icon: <ImageIcon className="w-4 h-4 min-w-4 min-h-4" />,
               type: "item",
               meta: {
                  type: "image",
                  content: imageObject.url,
                  uploading: true,
               },
               onClick: () => {
                  // onClickImage(imageObject)
                  tsvscode.postMessage({
                     type: "preview_image_file",
                     value: {
                        base64Data: imageObject.url,
                        ext: ".png",
                     },
                  })
               },
               clickable: true,
            }
            dispatch(setIsUploadingImage(true))
            const contexItems = getContextItems()
            contexItems.some((item) => item.id === "image")
               ? onUpdateImageItem(imageItem)
               : onAddImageItem(imageItem)

            try {
               const { data: responseData } = await API.BACKEND_LOCAL.post<{
                  status: "success" | "error"
                  image_url: string
                  message: string
               }>("/upload/image", { image: imageObject.url })

               if (responseData?.status === "error") {
                  onUpdateImageItem({ ...imageItem, error: true })
               } else {
                  onUpdateImageItem({
                     ...imageItem,
                     meta: { ...imageItem.meta, content: responseData.image_url, uploading: false },
                  })
               }
            } catch (error) {
               onUpdateImageItem({ ...imageItem, error: true, meta: { ...imageItem.meta, uploading: false } })
            } finally {
               dispatch(setIsUploadingImage(false))
            }
         })

         // console.log(`Added ${validImages.length} images to store`)
      } catch (error) {
         console.error("Error processing images:", error)
      }

      // Clear the input
      event.target.value = ""
   }

   return (
      <div className="relative inline-block">
         {/* Hidden file input */}
         <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none", outline: "none" }}
         />

         {/* Single icon button to attach image */}
         <button
            onClick={handleImageImport}
            className="flex items-center justify-center w-7 h-7 bg-transparent hover:bg-white hover:bg-opacity-10 rounded text-gray-400 hover:text-gray-200 transition-all duration-150 focus:outline-none focus:ring-0 focus:border-none border-none outline-none"
            title="Attach image"
            style={{ outline: "none" }}
         >
            <Image size={14} />
         </button>
      </div>
   )
}
