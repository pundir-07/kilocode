import { DiCode } from "react-icons/di"
import {
   FaCss3,
   FaDatabase,
   FaDocker,
   FaHtml5,
   FaJava,
   FaJs,
   FaMarkdown,
   FaNodeJs,
   FaPhp,
   FaPython,
   FaReact,
   FaRust,
   FaSwift,
   FaVuejs,
} from "react-icons/fa"
import {
   SiAngular,
   SiC,
   SiCplusplus,
   SiDart,
   SiElixir,
   SiElm,
   SiFlutter,
   SiGnubash,
   SiGo,
   SiGraphql,
   SiHaskell,
   SiJson,
   SiKotlin,
   SiLess,
   SiLua,
   SiMongodb,
   SiMysql,
   SiOcaml,
   SiPerl,
   SiPostgresql,
   SiR,
   SiRedis,
   SiRescript,
   SiRuby,
   SiSass,
   SiScala,
   SiSharp,
   SiSolidity,
   SiStylus,
   SiSvelte,
   SiToml,
   SiTypescript,
   SiYaml,
   SiZig,
} from "react-icons/si"

export function LanguageIcon({ language, className }: { language: string; className?: string }) {
   switch (language.toLowerCase()) {
      // Popular languages
      case "python":
      case "py":
         return <FaPython className={className} style={{ color: "#3776ab" }} />

      case "javascript":
      case "js":
         return <FaJs className={className} style={{ color: "#f7df1e" }} />

      case "typescript":
      case "ts":
         return <SiTypescript className={className} style={{ color: "#3178c6" }} />

      case "java":
         return <FaJava className={className} style={{ color: "#ed8b00" }} />

      case "c":
         return <SiC className={className} style={{ color: "#a8b9cc" }} />

      case "cpp":
      case "c++":
      case "cxx":
         return <SiCplusplus className={className} style={{ color: "#00599c" }} />

      case "csharp":
      case "c#":
      case "cs":
         return <SiSharp className={className} style={{ color: "#239120" }} />

      case "go":
      case "golang":
         return <SiGo className={className} style={{ color: "#00add8" }} />

      case "rust":
      case "rs":
         return <FaRust className={className} style={{ color: "#ce422b" }} />

      case "php":
         return <FaPhp className={className} style={{ color: "#777bb4" }} />

      case "ruby":
      case "rb":
         return <SiRuby className={className} style={{ color: "#cc342d" }} />

      case "swift":
         return <FaSwift className={className} style={{ color: "#fa7343" }} />

      case "kotlin":
      case "kt":
         return <SiKotlin className={className} style={{ color: "#7f52ff" }} />

      case "scala":
         return <SiScala className={className} style={{ color: "#dc322f" }} />

      // Web technologies
      case "html":
      case "htm":
         return <FaHtml5 className={className} style={{ color: "#e34f26" }} />

      case "css":
         return <FaCss3 className={className} style={{ color: "#1572b6" }} />

      case "react":
      case "jsx":
      case "tsx":
         return <FaReact className={className} style={{ color: "#61dafb" }} />

      case "vue":
         return <FaVuejs className={className} style={{ color: "#4fc08d" }} />

      case "nodejs":
      case "node":
         return <FaNodeJs className={className} style={{ color: "#339933" }} />

      // Functional languages
      case "elixir":
      case "ex":
         return <SiElixir className={className} style={{ color: "#4b275f" }} />

      case "elm":
         return <SiElm className={className} style={{ color: "#1293d8" }} />

      case "ocaml":
      case "ml":
         return <SiOcaml className={className} style={{ color: "#ec6813" }} />

      case "elisp":
      case "emacs-lisp":
         return <DiCode className={className} style={{ color: "#7f5ab6" }} />

      // Scripting languages
      case "lua":
         return <SiLua className={className} style={{ color: "#2c2d72" }} />

      case "bash":
      case "sh":
      case "shell":
         return <SiGnubash className={className} style={{ color: "#4eaa25" }} />

      // New/emerging languages
      case "zig":
         return <SiZig className={className} style={{ color: "#f7a41d" }} />

      case "rescript":
      case "res":
         return <SiRescript className={className} style={{ color: "#e34c4c" }} />

      // Blockchain/Smart contracts
      case "solidity":
      case "sol":
         return <SiSolidity className={className} style={{ color: "#363636" }} />

      // Data formats
      case "json":
         return <SiJson className={className} style={{ color: "#292929" }} />

      case "yaml":
      case "yml":
         return <SiYaml className={className} style={{ color: "#cb171e" }} />

      case "toml":
         return <SiToml className={className} style={{ color: "#9c4221" }} />

      // Additional popular languages
      case "haskell":
      case "hs":
         return <SiHaskell className={className} style={{ color: "#5d4f85" }} />

      case "perl":
      case "pl":
         return <SiPerl className={className} style={{ color: "#39457e" }} />

      case "r":
         return <SiR className={className} style={{ color: "#198ce7" }} />

      case "dart":
         return <SiDart className={className} style={{ color: "#0175c2" }} />

      case "flutter":
         return <SiFlutter className={className} style={{ color: "#02569b" }} />

      // CSS Preprocessors
      case "scss":
      case "sass":
         return <SiSass className={className} style={{ color: "#cf649a" }} />

      case "less":
         return <SiLess className={className} style={{ color: "#1d365d" }} />

      case "stylus":
      case "styl":
         return <SiStylus className={className} style={{ color: "#ff6347" }} />

      // Frontend Frameworks
      case "svelte":
         return <SiSvelte className={className} style={{ color: "#ff3e00" }} />

      case "angular":
         return <SiAngular className={className} style={{ color: "#dd0031" }} />

      // Documentation
      case "markdown":
      case "md":
         return <FaMarkdown className={className} style={{ color: "#083fa1" }} />

      // Infrastructure
      case "dockerfile":
      case "docker":
         return <FaDocker className={className} style={{ color: "#0db7ed" }} />

      // Database/Query languages
      case "sql":
         return <FaDatabase className={className} style={{ color: "#336791" }} />

      case "mysql":
         return <SiMysql className={className} style={{ color: "#4479a1" }} />

      case "postgresql":
      case "postgres":
         return <SiPostgresql className={className} style={{ color: "#336791" }} />

      case "mongodb":
      case "mongo":
         return <SiMongodb className={className} style={{ color: "#47a248" }} />

      case "redis":
         return <SiRedis className={className} style={{ color: "#dc382d" }} />

      case "graphql":
      case "gql":
         return <SiGraphql className={className} style={{ color: "#e10098" }} />

      // Apple/iOS development
      case "objc":
      case "objective-c":
      case "objectivec":
         return <DiCode className={className} style={{ color: "#438eff" }} />

      // Formal verification
      case "tlaplus":
      case "tla+":
         return <DiCode className={className} style={{ color: "#4b275f" }} />

      // Query languages
      case "ql":
         return <DiCode className={className} />

      // SystemRDL (hardware description)
      case "systemrdl":
         return <DiCode className={className} style={{ color: "#0066cc" }} />

      // Templates
      case "embedded_template":
      case "erb":
      case "ejs":
         return <DiCode className={className} style={{ color: "#ff6b6b" }} />

      // Default fallback
      default:
         return <DiCode className={className} style={{ color: "#6b7280" }} />
   }
}
