import { Link } from "react-router-dom"
import { BugIcon, SparklesIcon, Notebook, BeakerIcon, FileBoxIcon } from "lucide-react"

// Agent card configuration with categories
const AGENT_CARDS = {
   "SPECIALIZED AGENTS": [
      {
         route: "swagger",
         title: "Swagger",
         description: "Work with Swagger documentation and API specifications",
         icon: <FileBoxIcon className="w-6 h-6" />,
      },
   ],
   "CODE HELPERS": [
      {
         route: "debug",
         title: "Debug",
         description: "Find and fix bugs in your code with AI assistance",
         icon: <BugIcon className="w-6 h-6" />,
      },
      {
         route: "optimize",
         title: "Optimize",
         description: "Improve performance and efficiency of your code",
         icon: <SparklesIcon className="w-6 h-6" />,
      },
      {
         route: "review",
         title: "Review",
         description: "Get AI code reviews and suggestions for improvement",
         icon: <Notebook className="w-6 h-6" />,
      },
      {
         route: "testcases",
         title: "Testcase",
         description: "Generate test cases for your code automatically",
         icon: <BeakerIcon className="w-6 h-6" />,
      },
   ],
}

export default function Agents() {
   return (
      <div>
         {Object.keys(AGENT_CARDS).map((category) => (
            <div key={category} className="mb-6 last:mb-0">
               <h3 className="text-sm font-medium text-[var(--vscode-descriptionForeground)] mb-2">
                  {category}
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AGENT_CARDS[category].map((card) => (
                     <Link
                        key={card.route}
                        to={card.route}
                        className="!outline-none !text-[var(--vscode-foreground)] border border-[var(--vscode-panel-border)] rounded-lg p-4 cursor-pointer hover:bg-[var(--vscode-list-hoverBackground)] block"
                     >
                        <div className="flex items-center gap-3 mb-2">
                           <div className="p-2 rounded-md bg-[var(--vscode-button-secondaryBackground)]">
                              {card.icon}
                           </div>
                           <h3 className="text-lg font-semibold">{card.title}</h3>
                        </div>
                        <p className="text-sm opacity-70">{card.description}</p>
                     </Link>
                  ))}
               </div>
            </div>
         ))}
      </div>
   )
}
