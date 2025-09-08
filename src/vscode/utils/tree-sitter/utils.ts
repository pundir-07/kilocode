import { getTreeSitterForLanguage } from "./parser"
import * as vscode from "vscode"
import Parser from "web-tree-sitter"

export const IDENTIFIERS = [
   // Generic identifiers
   "identifier",
   "name",

   // Variable-related
   "variable_identifier",
   "const_identifier",
   "let_identifier",
   "var_identifier",
   "static_identifier",
   "mutable_identifier",

   // Function-related
   "function_identifier",
   "method_identifier",
   "constructor_identifier",
   "destructor_identifier",
   "lambda_identifier",
   "closure_identifier",
   "async_function_identifier",
   "generator_identifier",

   // Type-related
   "type_identifier",
   "class_identifier",
   "struct_identifier",
   "interface_identifier",
   "enum_identifier",
   "union_identifier",
   "type_alias_identifier",
   "trait_identifier",
   "protocol_identifier",
   "generic_identifier",

   // Object-oriented
   "property_identifier",
   "field_identifier",
   "accessor_identifier",
   "getter_identifier",
   "setter_identifier",

   // Module system
   "module_identifier",
   "namespace_identifier",
   "package_identifier",
   "import_identifier",
   "export_identifier",

   // Parameters and variables
   "parameter_identifier",
   "argument_identifier",
   "receiver_identifier",
   "self_identifier",
   "this_identifier",

   // Control flow
   "label_identifier",
   "catch_identifier",
   "finally_identifier",

   // Special cases
   "macro_identifier", // Rust, C/C++
   "decorator_identifier", // Python, TypeScript
   "annotation_identifier", // Java
   "attribute_identifier", // C#
   "channel_identifier", // Go
   "coroutine_identifier", // Python
]

export const DECLARATIONS = [
   // Function-related
   "function_declaration",
   "method_declaration",
   "constructor_declaration",
   "destructor_declaration",
   "generator_function_declaration",
   "async_function_declaration",

   // Type-related
   "class_declaration",
   "struct_declaration",
   "interface_declaration",
   "enum_declaration",
   "type_alias_declaration",
   "union_declaration",
   "trait_declaration",
   "protocol_declaration",
   "mixin_declaration",

   // Variable-related
   "variable_declaration",
   "const_declaration",
   "let_declaration",
   "var_declaration",
   "static_declaration",
   "field_declaration",
   "property_declaration",

   // Module system
   "module_declaration",
   "namespace_declaration",
   "package_declaration",
   "import_declaration",
   "export_declaration",

   // Object-oriented
   "getter_declaration",
   "setter_declaration",
   "accessor_declaration",

   // Language-specific
   "decorator_declaration", // Python, TypeScript
   "macro_declaration", // Rust, C/C++
   "annotation_declaration", // Java
   "attribute_declaration", // C#
   "extension_declaration", // Swift
   "impl_declaration", // Rust
   "typedef_declaration", // C/C++
   "template_declaration", // C++
   "generic_declaration", // Java, C#

   // Special declarations
   "record_declaration", // Java, C#
   "data_class_declaration", // Kotlin
   "case_class_declaration", // Scala
   "value_class_declaration", // Scala
   "newtype_declaration", // Haskell
   "type_class_declaration", // Haskell
   "protocol_extension_declaration", // Swift
   "category_declaration", // Objective-C
]

export const DEFINITIONS = [
   // Function-related
   "function_definition",
   "method_definition",
   "constructor_definition",
   "destructor_definition",
   "lambda_definition",
   "arrow_function_definition",
   "generator_function_definition",
   "async_function_definition",

   // Type-related
   "class_definition",
   "struct_definition",
   "interface_definition",
   "enum_definition",
   "type_definition",
   "union_definition",
   "trait_definition",

   // Variable-related
   "variable_definition",
   "const_definition",
   "let_definition",
   "var_definition",
   "static_definition",
   "field_definition",
   "property_definition",

   // Language-specific
   "decorator_definition",
   "macro_definition",
   "impl_definition",
]

export const DECLARATORS = [
   // Function-related
   "function_declarator",
   "method_declarator",
   "constructor_declarator",
   "destructor_declarator",
   "lambda_declarator",
   "arrow_function_declarator",
   "generator_function_declarator",
   "async_function_declarator",

   // Type-related
   "class_declarator",
   "struct_declarator",
   "interface_declarator",
   "enum_declarator",
   "type_alias_declarator",
   "union_type_declarator",
   "trait_declarator",
   "protocol_declarator",
   "mixin_declarator",

   // Variable-related
   "variable_declarator",
   "const_declarator",
   "let_declarator",
   "var_declarator",
   "static_declarator",
   "field_declarator",
   "property_declarator",

   // Module system
   "module_declarator",
   "namespace_declarator",
   "package_declarator",
   "import_declarator",
   "export_declarator",

   // Object-oriented
   "getter_declarator",
   "setter_declarator",
   "accessor_declarator",

   // Language-specific
   "decorator_declarator",
   "macro_declarator",
   "annotation_declarator",
   "attribute_declarator",
   "extension_declarator",
   "impl_declarator",
   "typedef_declarator",
   "template_declarator",
   "generic_declarator",

   // Special declarators
   "record_declarator",
   "data_class_declarator",
   "case_class_declarator",
   "value_class_declarator",
   "newtype_declarator",
   "type_class_declarator",
   "protocol_extension_declarator",
   "category_declarator",
]

export const EXPRESSIONS = [
   // Function expressions
   "lambda_expression",
   "arrow_function",
   "async_arrow_function",
   "generator_expression",

   // Control flow
   "try_statement",
   "catch_clause",
   "finally_clause",
   "if_statement",
   "else_clause",
   "switch_statement",
   "case_clause",
   "while_statement",
   "for_statement",
   "do_statement",

   // Other expressions
   "binary_expression",
   "unary_expression",
   "ternary_expression",
   "call_expression",
   "member_expression",
   "array_expression",
   "object_expression",
   "new_expression",
   "yield_expression",
   "await_expression",
]

const RECOGNIZED_NODE_TYPES = [...DECLARATIONS, ...DEFINITIONS, ...DECLARATORS, ...EXPRESSIONS]
export async function textToTreeSitterTree(text: string, language: string): Promise<Parser.Tree> {
   const parser = await getTreeSitterForLanguage(language)
   const tree = parser.parse(text);
  if (!tree) throw new Error(`Failed to parse with Tree-sitter for language: ${language}`);
  return tree;
}

export function getVSCodeRangeForNode(node: Parser.Node): vscode.Range {
   const startPosition = new vscode.Position(node.startPosition.row, node.startPosition.column)
   const endPosition = new vscode.Position(node.endPosition.row, node.endPosition.column)
   return new vscode.Range(startPosition, endPosition)
}

export function findNodeFromVSCodeRange(
  range: vscode.Range,
  tree: Parser.Tree
): Parser.Node | null {
  // Find the target node in the tree
  const targetNode = tree.rootNode.descendantForPosition({
    row: range.start.line,
    column: range.start.character,
  });

  if (!targetNode) return null; // guard against null

  // First try to find a recognized node type in the current node's next siblings
  let currentNode: Parser.Node | null = targetNode;
  let nextSibling: Parser.Node | null = currentNode.nextSibling;

  while (nextSibling && !RECOGNIZED_NODE_TYPES.includes(nextSibling.type)) {
    nextSibling = nextSibling.nextSibling;
  }

  if (nextSibling && RECOGNIZED_NODE_TYPES.includes(nextSibling.type)) {
    return nextSibling;
  }

  // If no recognized sibling found, try parent's next siblings
  currentNode = targetNode.parent;
  while (currentNode) {
    nextSibling = currentNode.nextSibling;
    while (nextSibling && !RECOGNIZED_NODE_TYPES.includes(nextSibling.type)) {
      nextSibling = nextSibling.nextSibling;
    }

    if (nextSibling && RECOGNIZED_NODE_TYPES.includes(nextSibling.type)) {
      return nextSibling;
    }

    currentNode = currentNode.parent;
  }

  // If still no recognized node found, return null
  return null;
}


export function findRecognizedParentNode(node: Parser.Node): Parser.Node | null {
   let current: Parser.Node | null = node.parent
   while (current) {
      if (RECOGNIZED_NODE_TYPES.includes(current.type)) {
         return current
      }
      current = current.parent
   }
   return null
}

export function getNodesFromTreeByName(name: string, tree: Parser.Tree): Parser.Node[] {
   const result: Parser.Node[] = []
   const cursor = tree.rootNode.walk()

   let reachedRoot = false
   while (!reachedRoot) {
      // Check if current node is a recognized type
      if (RECOGNIZED_NODE_TYPES.includes(cursor.nodeType)) {
         if (!name) {
            result.push(cursor.currentNode)
            continue
         }

         // If name is not empty, check if this node contains the identifier with this name
         for (const child of cursor.currentNode.children) {
            if(!child)
               continue
            if (![...IDENTIFIERS, ...DECLARATORS].includes(child.type)) continue

            if (child.text === name) {
               result.push(cursor.currentNode)
               break
            }
         }
      }

      if (cursor.gotoFirstChild()) continue
      if (cursor.gotoNextSibling()) continue

      // Go up and try next siblings
      do {
         if (!cursor.gotoParent()) {
            reachedRoot = true
            break
         }
      } while (!cursor.gotoNextSibling())
   }

   return result
}

export function getNodeName(node: Parser.Node): string {
   switch (node.type) {
      case "identifier":
      case "name":
         return node.text
      case "function_declaration":
      case "function_definition":
      case "method_definition":
      case "class_declaration":
      case "enum_declaration":
      case "interface_declaration":
      case "type_alias_declaration":
      case "variable_declaration":
      case "const_declaration":
      case "let_declaration":
         let name = ""
         for (const child of node.children) {
            if(!child)
               continue
            if (child.type === "identifier" || child.type === "name") {
               name = child.text
               break
            }
         }
         return name
      default:
         return ""
   }
}

export function getFullNodeBody(node: Parser.Node): string {
   return node.text.trim()

   // switch (node.type) {
   //    case "function_declaration":
   //    case "function_definition":
   //    case "method_definition": {
   //       // Find the body block which is typically the last child with type "statement_block"
   //       const bodyNode = node.children.find((child) => child.type === "statement_block")
   //       return bodyNode ? bodyNode.text : node.text
   //    }
   //    case "class_declaration": {
   //       // Find the class body which is typically enclosed in { }
   //       const bodyNode = node.children.find((child) => child.type === "class_body")
   //       return bodyNode ? bodyNode.text : node.text
   //    }
   //    case "enum_declaration": {
   //       // Find the enum body which is enclosed in { }
   //       const bodyNode = node.children.find((child) => child.type === "enum_body")
   //       return bodyNode ? bodyNode.text : node.text
   //    }
   //    case "interface_declaration": {
   //       // Find the interface body which is typically enclosed in { }
   //       const bodyNode = node.children.find((child) => child.type === "object_type")
   //       return bodyNode ? bodyNode.text : node.text
   //    }
   //    case "type_alias_declaration": {
   //       // For type aliases, get the type definition part
   //       const equalsSignIndex = node.children.findIndex((child) => child.type === "=")
   //       if (equalsSignIndex >= 0 && equalsSignIndex < node.children.length - 1) {
   //          return node.children
   //             .slice(equalsSignIndex + 1)
   //             .map((child) => child.text)
   //             .join("")
   //       }
   //       return node.text
   //    }
   //    default:
   //       return node.text
   // }
}
