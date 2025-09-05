import { markdown } from "@codemirror/lang-markdown"
import { GFM, MarkdownParser } from "@lezer/markdown"
import { useEffect, useMemo, useState } from "react"

import { CodeBlockProps } from "./components/Code"
import { CommandBlockProps } from "./components/Command"
import { NodeRenderer } from "./renderer"

type RichMessageProps = {
   content: string
} & Partial<CodeBlockProps> &
   Partial<CommandBlockProps>

const parser = markdown({
   extensions: GFM,
}).language.parser as MarkdownParser

export default function RichMessage({ content, ...props }: RichMessageProps) {
   const [tree, setTree] = useState(() => parser.parse(content))

   useEffect(() => {
      const newTree = parser.parse(content)
      setTree(newTree)
   }, [content])

   const renderedContent = useMemo(() => {
      return <NodeRenderer cursor={tree.topNode} content={content} />
   }, [tree, content, props])

   return <div className="space-y-2 whitespace-normal">{renderedContent}</div>
}
