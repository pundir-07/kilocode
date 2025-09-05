import * as ReactDOM from "react-dom/client"
import { Provider } from "react-redux"

import { store } from "@/views/lib/store"
import AppLayout from "./_layout"

// console.clear()

const rootElement = document.getElementById("app")
ReactDOM.createRoot(rootElement).render(
   <Provider store={store}>
      <AppLayout />
   </Provider>
)
