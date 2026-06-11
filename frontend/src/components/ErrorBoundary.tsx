"use client"

import { Component, type ReactNode } from "react"

interface Props {
  label: string
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.label}] component failure:`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <div className="text-xs font-mono text-red-400 mb-2">
              {"// "}{this.props.label.toUpperCase()} FAILURE — ATTEMPTING RECOVERY
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400
                         hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
