'use client'

import { useState, useMemo, useCallback, type ComponentType, Component } from 'react'
import { Player } from '@remotion/player'
import {
  useCurrentFrame,
  interpolate,
  AbsoluteFill,
  spring,
  useVideoConfig,
  Sequence,
  Easing,
  Img,
  staticFile,
  random,
} from 'remotion'
import React from 'react'
import { AlertCircle, RefreshCw, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sanitizeCode } from '@/lib/utils'

// PERFORMANCE FIX: Lazy load Babel (~2.5MB) only when needed
// This prevents the large bundle from blocking initial page load
let BabelModule: typeof import('@babel/standalone') | null = null

async function loadBabel() {
  if (!BabelModule) {
    BabelModule = await import('@babel/standalone')
  }
  return BabelModule
}

interface DynamicVideoPlayerProps {
  code: string
  width?: number
  height?: number
  fps?: number
  durationInFrames?: number
  controls?: boolean
  loop?: boolean
  showError?: boolean
  autoPlay?: boolean
  className?: string
}

interface CompilationResult {
  component: ComponentType | null
  error: string | null
}

// Proper React Error Boundary class component
interface ErrorBoundaryProps {
  children: React.ReactNode
  onError: (error: string) => void
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: string | null
}

class ComponentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error.message }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error.message)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}

// Validate code for common AI mistakes before compilation
function validateCode(code: string): string | null {
  // Check for Sequence inside SVG (common AI mistake)
  if (/<svg[\s\S]*?<Sequence[\s\S]*?<\/svg>/i.test(code)) {
    return 'Invalid: <Sequence> cannot be used inside <svg>. Sequence renders a div which is invalid in SVG. Use conditional rendering based on frame number instead (e.g., {frame >= 60 && <text>...</text>}).'
  }

  // Check for HTML elements inside SVG
  const svgBlocks = code.match(/<svg[^>]*>[\s\S]*?<\/svg>/gi) || []
  for (const svgBlock of svgBlocks) {
    if (/<(div|span|p|h[1-6]|button|input)\s/i.test(svgBlock)) {
      return 'Invalid: HTML elements (div, span, p, h1-h6) cannot be used inside <svg>. Use SVG elements like <text>, <rect>, <g>, <circle> instead.'
    }
  }

  return null
}

// Extract function name from code - finds the first function declaration with PascalCase name
function extractComponentName(code: string): string | null {
  // Match function declarations: function Name() or const Name = () or const Name = function
  const functionMatch = code.match(/function\s+([A-Z][a-zA-Z0-9]*)\s*\(/)
  if (functionMatch) return functionMatch[1]

  const constArrowMatch = code.match(/const\s+([A-Z][a-zA-Z0-9]*)\s*=\s*\(?/)
  if (constArrowMatch) return constArrowMatch[1]

  return null
}

async function compileComponent(code: string): Promise<CompilationResult> {
  try {
    // Check for empty or whitespace-only code
    if (!code || !code.trim()) {
      return { component: null, error: 'No code provided' }
    }

    // Sanitize the code first - remove box-drawing characters and other formatting issues
    // This is defense-in-depth since the API routes should also sanitize
    code = sanitizeCode(code)

    // Auto-fix common AI mistake: fromValue/toValue → from/to in spring() calls
    // The Remotion spring() function uses "from" and "to", not "fromValue" and "toValue"
    code = code
      .replace(/\bfromValue\s*:/g, 'from:')
      .replace(/\btoValue\s*:/g, 'to:')

    // Validate code for common AI mistakes before processing
    const validationError = validateCode(code)
    if (validationError) {
      return { component: null, error: validationError }
    }

    // Clean the code:
    // 1. Remove import statements (we provide these in scope)
    // 2. Handle export statements
    let cleanedCode = code
      // Remove import statements for remotion
      .replace(/import\s+\{[^}]*\}\s+from\s+['"]remotion['"];?\n?/g, '')
      // Remove import statements for react
      .replace(/import\s+(?:\*\s+as\s+)?React(?:\s*,\s*\{[^}]*\})?\s+from\s+['"]react['"];?\n?/g, '')
      // Remove other common imports that we don't support
      .replace(/import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?\n?/g, '')
      // Convert 'export default function X' to 'function X'
      .replace(/export\s+default\s+function\s+/g, 'function ')
      // Convert 'export function X' to 'function X'
      .replace(/export\s+function\s+/g, 'function ')
      // Convert 'export const X' to 'const X'
      .replace(/export\s+const\s+/g, 'const ')
      // Strip TypeScript type annotations for runtime compatibility
      // Remove interface/type declarations
      .replace(/^\s*(export\s+)?(interface|type)\s+\w+[^;{]*[;{][^}]*}?/gm, '')
      // Remove function return types: ): Type { -> ) {
      .replace(/\)\s*:\s*[\w<>\[\]|&\s,]+(?=\s*[{=>])/g, ')')
      // Remove parameter types: (x: Type) -> (x)
      .replace(/(\(|,)\s*(\w+)\s*:\s*[\w<>\[\]|&\s,]+(?=\s*[,)=])/g, '$1$2')
      // Remove variable types: const x: Type = -> const x =
      .replace(/(const|let|var)\s+(\w+)\s*:\s*[\w<>\[\]|&\s,]+\s*=/g, '$1 $2 =')
      // Remove type assertions: as Type
      .replace(/\s+as\s+[\w<>\[\]|&\s,]+/g, '')

    // Extract component name before Babel transform (easier to find in original code)
    const componentName = extractComponentName(cleanedCode)

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DynamicVideoPlayer] Compiling code:', {
        originalLength: code.length,
        cleanedPreview: cleanedCode.substring(0, 300),
        componentName,
      })
    }

    // PERFORMANCE FIX: Lazy load Babel only when needed
    const Babel = await loadBabel()

    // Transform JSX to React.createElement calls using Babel
    // Use explicit configuration to avoid shorthand property issues
    const transformed = Babel.transform(cleanedCode, {
      presets: [
        ['react', {
          runtime: 'classic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment',
        }]
      ],
      filename: 'composition.jsx',
    })

    if (!transformed.code) {
      return { component: null, error: 'Failed to transform JSX code' }
    }

    cleanedCode = transformed.code

    // Debug: log transformed code
    if (process.env.NODE_ENV === 'development') {
      console.log('[DynamicVideoPlayer] Babel output:', cleanedCode.substring(0, 500))
    }

    // Build the function body that returns the component
    const functionBody = `
      ${cleanedCode}

      // Return the component by detected name or fallback to common names
      ${componentName ? `if (typeof ${componentName} !== 'undefined') return ${componentName};` : ''}
      if (typeof VideoComposition !== 'undefined') return VideoComposition;
      if (typeof Composition !== 'undefined') return Composition;
      if (typeof Animation !== 'undefined') return Animation;
      if (typeof Video !== 'undefined') return Video;
      if (typeof Scene !== 'undefined') return Scene;
      if (typeof Main !== 'undefined') return Main;

      throw new Error('Could not find a video composition component. Make sure your code exports a function with a PascalCase name.');
    `

    // Create function with Remotion and React in scope
    const createComponent = new Function(
      'React',
      'useCurrentFrame',
      'interpolate',
      'AbsoluteFill',
      'spring',
      'useVideoConfig',
      'Sequence',
      'Easing',
      'Img',
      'staticFile',
      'random',
      functionBody
    )

    const Component = createComponent(
      React,
      useCurrentFrame,
      interpolate,
      AbsoluteFill,
      spring,
      useVideoConfig,
      Sequence,
      Easing,
      Img,
      staticFile,
      random
    ) as ComponentType

    // Validate that we got a valid component
    if (typeof Component !== 'function') {
      return { component: null, error: 'The code did not produce a valid React component' }
    }

    return { component: Component, error: null }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown compilation error'
    console.error('[DynamicVideoPlayer] Compilation error:', err)
    return { component: null, error: errorMessage }
  }
}

// Error boundary wrapper component
function ErrorFallback({
  error,
  showDetails,
  onRetry,
}: {
  error: string
  showDetails: boolean
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Failed to render animation</p>
      {showDetails && (
        <p className="text-xs text-muted-foreground max-w-md wrap-break-word mb-4">{error}</p>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3 w-3 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// Wrapper component that catches runtime errors from the dynamic component
function SafeComponentRenderer({
  Component,
  onError,
}: {
  Component: ComponentType
  onError: (error: string) => void
}) {
  return (
    <ComponentErrorBoundary onError={onError}>
      <Component />
    </ComponentErrorBoundary>
  )
}

export function DynamicVideoPlayer({
  code,
  width = 1280,
  height = 720,
  fps = 30,
  durationInFrames = 300,
  controls = true,
  loop = true,
  showError = false,
  autoPlay = false,
  className,
}: DynamicVideoPlayerProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [isCompiling, setIsCompiling] = useState(false)
  const [compilationResult, setCompilationResult] = useState<CompilationResult>({
    component: null,
    error: null,
  })

  // Track the previous code to detect changes
  const [prevCode, setPrevCode] = useState(code)

  // Reset runtime error when code changes
  if (code !== prevCode) {
    setPrevCode(code)
    setRuntimeError(null)
  }

  // PERFORMANCE FIX: Async compilation with lazy-loaded Babel
  // This prevents the ~2.5MB Babel bundle from blocking initial page load
  React.useEffect(() => {
    let cancelled = false

    async function compile() {
      if (!code || !code.trim()) {
        setCompilationResult({ component: null, error: 'No code provided' })
        return
      }

      setIsCompiling(true)
      try {
        const result = await compileComponent(code)
        if (!cancelled) {
          setCompilationResult(result)
        }
      } catch (err) {
        if (!cancelled) {
          setCompilationResult({
            component: null,
            error: err instanceof Error ? err.message : 'Compilation failed',
          })
        }
      } finally {
        if (!cancelled) {
          setIsCompiling(false)
        }
      }
    }

    compile()

    return () => {
      cancelled = true
    }
  }, [code, retryKey])

  const handleRuntimeError = useCallback((error: string) => {
    setRuntimeError(error)
  }, [])

  const handleRetry = useCallback(() => {
    setRuntimeError(null)
    setRetryKey(k => k + 1)
  }, [])

  // Show loading state while compiling (including Babel lazy load)
  if (isCompiling) {
    return (
      <div className={className} style={{ aspectRatio: `${width}/${height}` }}>
        <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <p className="text-sm font-medium text-foreground">Compiling animation...</p>
          <p className="text-xs text-muted-foreground">Loading code transformer</p>
        </div>
      </div>
    )
  }

  // If there's a compilation error, show it
  if (compilationResult.error) {
    return (
      <div className={className} style={{ aspectRatio: `${width}/${height}` }}>
        <ErrorFallback
          error={compilationResult.error}
          showDetails={showError}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  // If there's a runtime error, show it
  if (runtimeError) {
    return (
      <div className={className} style={{ aspectRatio: `${width}/${height}` }}>
        <ErrorFallback error={runtimeError} showDetails={showError} onRetry={handleRetry} />
      </div>
    )
  }

  // If no component was compiled, show placeholder
  if (!compilationResult.component) {
    return (
      <div
        className={className}
        style={{ aspectRatio: `${width}/${height}` }}
      >
        <div className="flex flex-col items-center justify-center h-full bg-muted/30 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Play className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">No animation to preview</p>
          <p className="text-xs text-muted-foreground">Generate or write code first</p>
        </div>
      </div>
    )
  }

  // Create a wrapper component that handles runtime errors
  const WrappedComponent = () => (
    <SafeComponentRenderer
      Component={compilationResult.component!}
      onError={handleRuntimeError}
    />
  )

  return (
    <div className={className}>
      <Player
        key={retryKey}
        component={WrappedComponent}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: '100%', height: '100%' }}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
      />
    </div>
  )
}
