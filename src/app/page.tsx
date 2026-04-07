import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-xl font-semibold tracking-tight">StagePage</span>
        <div className="flex gap-3">
          <Link href="/auth/login" className={cn(buttonVariants({ variant: 'ghost' }), 'text-white hover:text-white hover:bg-zinc-800')}>
            Log in
          </Link>
        </div>
      </header>

      <main className="flex flex-col flex-1 items-center justify-center px-8 text-center gap-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight max-w-2xl leading-tight">
            Technical packets that stay up to date.
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Venues maintain their tech specs in one place. Artists request access
            and always get the latest version — no stale PDFs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link
            href="/auth/signup?role=venue"
            className={cn(buttonVariants({ size: 'lg' }), 'min-w-44')}
          >
            I&apos;m a venue
          </Link>
          <Link
            href="/auth/signup?role=artist"
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'min-w-44 border-zinc-700 bg-transparent text-white hover:bg-zinc-800 hover:text-white'
            )}
          >
            I&apos;m an artist
          </Link>
        </div>
        <p className="text-zinc-600 text-sm -mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
