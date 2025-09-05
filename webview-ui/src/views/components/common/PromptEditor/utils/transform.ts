export const parseContext = (contextString: string) => {
   const nameMatch = contextString.match(/<cm:context:name>([\s\S]*?)<\/cm:context:name>/)
   const contentMatch = contextString.match(/<cm:context:content>([\s\S]*?)<\/cm:context:content>/)

   return {
      name: nameMatch ? nameMatch[1].trim() : "context",
      content: contentMatch ? contentMatch[1].trim() : "",
      type:"context"
   }
}

export const convertToPreview = (content: string): string => {
   if (!content ) return ""
   if(Array.isArray(content)){
      for(const contentObject of content){
         if(contentObject.type=="text"){
            content= contentObject.text
            break
         }
      }
   }else if(typeof content !=="string"){
      return ''
   }

   if (content.startsWith("<summary>")) return "Forked chat"

   const parts = content.split(/(<cm:context>[\s\S]*?<\/cm:context>)/g).filter(Boolean)

   const preview = parts
      .map((part) => {
         if (part.startsWith("<cm:context>")) {
            const contextData = parseContext(part)
            return `@${contextData.name}`
         }
         return part
      })
      .join("")

   return preview.trim()
}
