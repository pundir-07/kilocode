import { KnowledgebaseStatus, KnowledgebaseTypeDocs_t } from "@/common/types/knowledgebase"
import { RootState } from "@/views/lib/store"
import { selectKnowledgebaseById, updateKnowledgebase } from "@/views/lib/store/knowledgebasesSlice"
import { AlertCircle, Plus, X } from "lucide-react"
import { useState } from "react"
import { useDispatch, useSelector } from "react-redux"

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

export default function Docs(props: { kbID: string; readonly?: boolean }) {
   const dispatch = useDispatch()
   const kb = useSelector(
      (state: RootState) => selectKnowledgebaseById(state, props.kbID) as KnowledgebaseTypeDocs_t
   )
   const isWorking = kb?.status === KnowledgebaseStatus.PROGRESS
   const [urlErrors, setUrlErrors] = useState<Record<number, string>>({})

   return (
      <div className="flex flex-col gap-4">
         {kb.metadata.urls.map((url, index) => (
            <div key={index} className="flex flex-col gap-2">
               <div className="flex gap-2">
                  <div className="relative flex-1">
                     <input
                        type="text"
                        disabled={isWorking || props.readonly}
                        value={url}
                        onChange={(e) => {
                           const value = e.target.value;
                           const newUrls = [...kb.metadata.urls];
                           newUrls[index] = value;

                           const newErrors = { ...urlErrors };
                           if (!isValidUrl(value)) {
                             newErrors[index] = "Please enter a valid URL.";
                           } else {
                             delete newErrors[index];
                           }
                           setUrlErrors(newErrors);

                           dispatch(
                              updateKnowledgebase({
                                 id: props.kbID,
                                 updates: { metadata: { urls: newUrls } },
                              })
                           );
                        }}
                        placeholder="Enter documentation URL"
                        className={`w-full rounded border ${
                           urlErrors[index]
                              ? "border-[var(--vscode-inputValidation-errorBorder)]"
                              : "border-[var(--vscode-input-border)]"
                        } bg-[var(--vscode-input-background)] p-2 text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] ${
                           isWorking
                              ? "opacity-50 cursor-not-allowed pointer-events-none"
                              : props.readonly
                                ? "cursor-not-allowed pointer-events-none"
                                : ""
                        }`}
                     />
                     {urlErrors[index] && (
                        <div className="flex items-center gap-2 mt-1 text-[var(--vscode-inputValidation-errorForeground)] text-sm">
                           <AlertCircle className="w-4 h-4" />
                           <span>{urlErrors[index]}</span>
                        </div>
                     )}
                  </div>
                  <button
                     onClick={() => {
                        const newUrls = kb.metadata.urls.filter((_, i) => i !== index)
                        dispatch(
                           updateKnowledgebase({
                              id: props.kbID,
                              updates: { metadata: { urls: newUrls } },
                           })
                        )
                     }}
                     disabled={isWorking || props.readonly || kb.metadata.urls.length === 1}
                     className={`p-2 w-min rounded hover:bg-[var(--vscode-toolbar-hoverBackground)] ${
                        isWorking || kb.metadata.urls.length === 1
                           ? "opacity-50 cursor-not-allowed"
                           : props.readonly
                             ? "cursor-not-allowed pointer-events-none"
                             : ""
                     } text-[var(--vscode-foreground)]`}
                  >
                     <X className="w-4 h-4" />
                  </button>
               </div>
            </div>
         ))}
         <button
            onClick={() =>
               dispatch(
                  updateKnowledgebase({
                     id: props.kbID,
                     updates: { metadata: { urls: [...kb.metadata.urls, ""] } },
                  })
               )
            }
            disabled={isWorking || props.readonly}
            className={`self-start px-3 py-1 rounded-md bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] ${
               isWorking
                  ? "opacity-50 cursor-not-allowed"
                  : props.readonly
                    ? "cursor-not-allowed pointer-events-none"
                    : "hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
            } flex items-center gap-2`}
         >
            <Plus className="w-4 h-4" />
            <span>Add URL</span>
         </button>
      </div>
   )
}
