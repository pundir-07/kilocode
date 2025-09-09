import styled from "styled-components"
import { vscode } from "@/utils/vscode"
import { useCallback, useState } from "react"
import { Mode } from "@roo/modes"

const SwitchOption = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isActive"].includes(prop),
})<{ isActive: boolean }>`
  padding: 4px 12px;
  color: ${(props) => (props.isActive ? "white" : "var(--vscode-input-foreground)")};
  z-index: 2;
  transition: color 0.2s ease;
  font-size: 12px;
  width: calc(50% - 4px);
  text-align: center;
  cursor: pointer;
  position: relative;
  border-radius: 12px; /* Match the container radius */
  
  /* Create a pseudo-element for hover background */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--vscode-toolbar-hoverBackground);
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: -1;
  }

  &:hover:not(.active)::before {
    opacity: ${(props) => (props.isActive ? 0 : 1)};
  }
`

const PLAN_MODE_COLOR = "var(--vscode-activityWarningBadge-background)"
const ACT_MODE_COLOR = "var(--vscode-focusBorder)"

const SwitchContainer = styled.div<{ disabled: boolean }>`
  display: flex;
  align-items: center;
  position: relative;
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 12px;
  overflow: hidden;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transform: scale(0.85);
  transform-origin: right center;
  margin-left: -10px;
  user-select: none;
`

const Divider = styled.div`
  flex: 0 0 8px;
  z-index: 1;
`

const Slider = styled.div.withConfig({
  shouldForwardProp: (prop) => !["isAct", "isPlan"].includes(prop),
})<{ isAct: boolean; isPlan?: boolean }>`
  position: absolute;
  top: 2px; /* Small offset from border */
  left: 2px;
  height: calc(100% - 4px); /* Account for border offset */
  width: calc(50% - 6px); /* Slightly smaller to account for padding */
  background-color: ${(props) => (props.isPlan ? PLAN_MODE_COLOR : ACT_MODE_COLOR)};
  transition: transform 0.2s ease;
  transform: translateX(${(props) => (props.isAct ? "calc(100% + 6px)" : "0%")});
  border-radius: 10px; /* Slightly smaller radius to fit within container */
  z-index: 1;
`

export default function CodemateModeSelector({mode}:{mode:Mode}) {
  // const [mode, setMode] = useState<"architect" | "agent">("architect")

  const onModeToggle = useCallback(
    (selectedValue: "architect" | "agent") => {
      vscode.postMessage({ type: "mode", text: selectedValue })
    },
    []
  )

  return (
    <SwitchContainer data-testid="mode-switch" disabled={false}>
      <Slider isAct={mode === "agent"} isPlan={mode === "architect"} />

      <SwitchOption
        aria-checked={mode === "architect"}
        isActive={mode === "architect"}
        onClick={() => onModeToggle("architect")}
        role="tab"
        className={mode === "architect" ? "active" : ""}
      >
        Architect
      </SwitchOption>

      <Divider />

      <SwitchOption
        aria-checked={mode === "agent"}
        isActive={mode === "agent"}
        onClick={() => onModeToggle("agent")}
        role="tab"
        className={mode === "agent" ? "active" : ""}
      >
        Agent
      </SwitchOption>
    </SwitchContainer>
  )
}