import { useCallback, useEffect, useRef, useState } from "react"

interface UseAutoScrollOptions {
  /** Existing ref to the scrollable container */
  scrollRef: React.RefObject<HTMLDivElement>
  /** Distance from bottom (in pixels) to consider as "at bottom" */
  threshold?: number
  /** Delay in ms after scroll stops to check position */
  scrollStopDelay?: number
  /** Dependencies that should trigger auto-scroll when changed */
  dependencies?: any[]
  /** Unique identifier for the scroll container (resets state when changed) */
  containerId?: string | number
}

interface UseAutoScrollReturn {
  /** Whether auto-scroll is currently enabled */
  isAutoScrollEnabled: boolean
  /** Whether user is currently scrolling */
  isUserScrolling: boolean
  /** Function to manually scroll to bottom */
  scrollToBottom: (smooth?: boolean) => void
  /** Function to manually enable/disable auto-scroll */
  setAutoScrollEnabled: (enabled: boolean) => void
  /** Scroll event handler to attach to the container */
  handleScroll: () => void
}

export function useAutoScroll({
  scrollRef,
  threshold = 100,
  scrollStopDelay = 150,
  dependencies = [],
  containerId
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const prevDependenciesRef = useRef<string>("")
  const isScrollingProgrammaticallyRef = useRef(false)

  // Function to check if user is at the bottom of the scroll
  const isAtBottom = useCallback(() => {
    const element = scrollRef.current
    if (!element) return false
    
    return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
  }, [scrollRef, threshold])

  // Function to scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const element = scrollRef.current
    if (!element) return
    
    isScrollingProgrammaticallyRef.current = true
    
    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    })

    // Reset the flag after scroll completes
    setTimeout(() => {
      isScrollingProgrammaticallyRef.current = false
    }, smooth ? 500 : 50)
  }, [scrollRef])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element || isScrollingProgrammaticallyRef.current) return
    
    setIsUserScrolling(true)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Set timeout to detect when user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false)
      
      // Check if user scrolled to bottom
      if (isAtBottom()) {
        setIsAutoScrollEnabled(true)
      } else {
        setIsAutoScrollEnabled(false)
      }
    }, scrollStopDelay)
  }, [scrollRef, isAtBottom, scrollStopDelay])

  // Convert dependencies to string for comparison
  const dependenciesString = JSON.stringify(dependencies)

  // Auto-scroll when dependencies change
  useEffect(() => {
    const prevDeps = prevDependenciesRef.current
    
    if (prevDeps !== dependenciesString && prevDeps !== "") {
      // Auto-scroll if enabled and not currently user scrolling
      if (isAutoScrollEnabled && !isUserScrolling) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          scrollToBottom(true)
        })
      }
    }
    
    // Update previous dependencies
    prevDependenciesRef.current = dependenciesString
  }, [dependenciesString, isAutoScrollEnabled, isUserScrolling, scrollToBottom])

  // Reset auto-scroll when container ID changes
  useEffect(() => {
    if (containerId !== undefined) {
      setIsAutoScrollEnabled(true)
      setIsUserScrolling(false)
      
      // Clear any existing scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      // Reset dependencies tracking
      prevDependenciesRef.current = ""
      
      // Scroll to bottom immediately when container changes
      requestAnimationFrame(() => {
        scrollToBottom(false)
      })
    }
  }, [containerId, scrollToBottom])

  // Initial scroll to bottom on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToBottom(false)
    })
  }, [scrollToBottom])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return {
    isAutoScrollEnabled,
    isUserScrolling,
    scrollToBottom,
    setAutoScrollEnabled: setIsAutoScrollEnabled,
    handleScroll
  }
}