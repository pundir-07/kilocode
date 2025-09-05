import { SyntaxNode } from "@lezer/common"
import RichMessageCode from "./components/Code"
import RichMessageCommand from "./components/Command"

type NodeRendererProps = {
   cursor: SyntaxNode
   content: string
}

export function NodeRenderer({ cursor: node, content }: NodeRendererProps) {
   const nodeName = node.type.name

   // New, correct child rendering logic
   const children = []
   let currentPos = node.from
   let child = node.firstChild
   while (child) {
      if (currentPos < child.from) {
         const textContent = content.slice(currentPos, child.from)
         // Filter out table delimiters for table-related nodes
         if (nodeName.includes("Table") && textContent.trim() === "|") {
            // Skip adding pipe delimiters as text nodes
         } else {
            children.push(textContent)
         }
      }
      children.push(<NodeRenderer key={child.from} cursor={child} content={content} />)
      currentPos = child.to
      child = child.nextSibling
   }
   if (currentPos < node.to) {
      const textContent = content.slice(currentPos, node.to)
      // Filter out table delimiters for table-related nodes
      if (nodeName.includes("Table") && textContent.trim() === "|") {
         // Skip adding pipe delimiters as text nodes
      } else {
         children.push(textContent)
      }
   }
   const filteredChildren = children.filter(Boolean)

   switch (nodeName) {
      case "Document":
         return <>{filteredChildren}</>
      case "Blockquote":
         return <blockquote className="pl-4 italic border-l-4 border-gray-300">{filteredChildren}</blockquote>
      case "ListItem": {
         if (node.parent?.type.name === "BulletList") {
            return <li>{filteredChildren}</li>
         }
         return (
            <li className="list-item relative pl-[1.75rem] [counter-increment:list-item] before:absolute before:left-0 before:w-5 before:text-right before:content-[counter(list-item)'.']">
               {filteredChildren}
            </li>
         )
      }
      case "Emphasis":
         return <em>{filteredChildren}</em>
      case "StrongEmphasis":
         return <strong>{filteredChildren}</strong>
      case "Paragraph":
         return <p className="[&:not(:first-child)]:mt-4">{filteredChildren}</p>
      case "ATXHeading1":
         return <h1 className="text-3xl font-bold">{filteredChildren}</h1>
      case "ATXHeading2":
         return <h2 className="text-2xl font-semibold">{filteredChildren}</h2>
      case "ATXHeading3":
         return <h3 className="text-xl font-semibold">{filteredChildren}</h3>
      case "BulletList":
         return <ul className="list-disc pl-6 space-y-2">{filteredChildren}</ul>
      case "OrderedList":
         return <ol className="[counter-reset:list-item] space-y-1 pb-3">{filteredChildren}</ol>
      case "FencedCode": {
         const infoNode = node.getChild("CodeInfo")
         const info = infoNode ? content.slice(infoNode.from, infoNode.to) : ""
         const codeNode = node.getChild("CodeText")
         const code = codeNode ? content.slice(codeNode.from, codeNode.to) : ""

         // Check if this is a command block
         if (code.trim().startsWith("<cm:command>")) {
            return <RichMessageCommand className={`language-shell`}>{code}</RichMessageCommand>
         }

         return <RichMessageCode className={`language-${info}`}>{code}</RichMessageCode>
      }
      case "InlineCode": {
         const code = content.slice(node.from + 1, node.to - 1)
         return (
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] text-sm font-semibold font-[family-name:JetBrains_Mono]">
               {code}
            </code>
         )
      }
      case "Link": {
         const urlNode = node.getChild("URL")
         if (!urlNode) return <>{filteredChildren}</>
         const url = content.slice(urlNode.from, urlNode.to)
         return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
               {filteredChildren}
            </a>
         )
      }
      case "Image": {
         const urlNode = node.getChild("URL")
         if (!urlNode) return <>{filteredChildren}</>
         const url = content.slice(urlNode.from, urlNode.to)
         const altNode = node.getChild("LinkTitle")
         const alt = altNode ? content.slice(altNode.from, altNode.to) : ""
         return <img src={url} alt={alt} className="max-w-full rounded-lg" />
      }
      case "Table": {
         const headerNode = node.getChild("TableHeader")
         const header = headerNode ? <NodeRenderer cursor={headerNode} content={content} /> : null

         const bodyRows = []
         let currentRow = headerNode ? headerNode.nextSibling : node.firstChild
         while (currentRow) {
            if (currentRow.type.name === "TableRow") {
               bodyRows.push(<NodeRenderer key={currentRow.from} cursor={currentRow} content={content} />)
            }
            currentRow = currentRow.nextSibling
         }

         return (
            <div className="my-4 overflow-x-auto">
               <table
                  className="w-full text-sm text-left"
                  style={{
                     color: "var(--vscode-editor-foreground)",
                     borderCollapse: "collapse",
                  }}
               >
                  {header}
                  {bodyRows.length > 0 && <tbody>{bodyRows}</tbody>}
               </table>
            </div>
         )
      }
      case "TableHeader":
         return (
            <thead
               className="text-xs uppercase"
               style={{
                  color: "var(--vscode-editor-foreground)",
                  backgroundColor: "var(--vscode-sideBar-background)",
               }}
            >
               <tr>{filteredChildren}</tr>
            </thead>
         )
      case "TableRow":
         return (
            <tr
               className="hover:bg-gray-50/5"
               style={{
                  backgroundColor: "var(--vscode-editor-background)",
                  color: "var(--vscode-editor-foreground)",
               }}
            >
               {filteredChildren}
            </tr>
         )
      case "TableCell": {
         const isHeader = node.parent?.type.name === "TableHeader"

         // Filter out pipe characters and clean cell content
         const cleanChildren = filteredChildren
            .map((child) => {
               if (typeof child === "string") {
                  // Remove all pipe characters and excessive whitespace
                  return child.replace(/\|/g, "").replace(/\s+/g, " ").trim()
               }
               return child
            })
            .filter((child) => {
               // Filter out empty strings, whitespace-only strings, and null/undefined
               if (typeof child === "string") {
                  return child.length > 0 && child.trim().length > 0
               }
               return child != null
            })

         if (isHeader) {
            return (
               <th
                  scope="col"
                  className="px-4 py-3"
                  style={{
                     border: "1px solid var(--vscode-panel-border)",
                  }}
               >
                  {cleanChildren}
               </th>
            )
         }
         return (
            <td
               className="px-4 py-3"
               style={{
                  border: "1px solid var(--vscode-panel-border)",
               }}
            >
               {cleanChildren}
            </td>
         )
      }
      case "HorizontalRule":
         return (
            <div className="py-3">
               <div className="h-[1px] bg-[var(--vscode-panel-border)]"></div>
            </div>
         )
      case "HardBreak":
         return <br />
      case "EmphasisMark":
      case "HeaderMark":
      case "LinkMark":
      case "ListMark":
         return null
      case "QuoteMark":
      case "URL":
         return null
      case "TableDelimiter":
      case "TableSeparator":
         return null
      default:
         return <>{filteredChildren}</>
   }
}
