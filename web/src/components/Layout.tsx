import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-2xl font-bold">LaunchPal</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}