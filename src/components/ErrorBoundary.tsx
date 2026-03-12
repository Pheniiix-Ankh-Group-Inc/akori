"use client"

import React, { ReactNode, ReactElement } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode)
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 * Capture les erreurs des composants enfants et affiche un fallback
 * 
 * Usage:
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log l'erreur pour monitoring
    console.error("ErrorBoundary caught an error:", error)
    console.error("Error Info:", errorInfo)

    // Envoyer à un service de logging (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === "production") {
      // Exemple avec Sentry:
      // Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactElement {
    if (this.state.hasError) {
      // Si fallback est une fonction, l'appeler avec l'erreur et la fonction retry
      // if (typeof this.props.fallback === "function") {
      //   return this.props.fallback(this.state.error!, this.handleRetry)
      // }

      // Si fallback est un ReactNode, l'afficher
      if (this.props.fallback) {
        return this.props.fallback as ReactElement
      }

      // Fallback par défaut
      return (
        <div 
          style={{
            padding: "2rem",
            backgroundColor: "#faf9f8",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
            margin: "2rem 0",
          }}
        >
          <h2 style={{ color: "#c4a46e", marginBottom: "0.5rem" }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: "#7a7570", marginBottom: "1rem" }}>
            {this.state.error?.message || "Une erreur inattendue s'est produite"}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#c4a46e",
              color: "#0c0c0c",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
          >
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children as ReactElement
  }
}

export default ErrorBoundary
