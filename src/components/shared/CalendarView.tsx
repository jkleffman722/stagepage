'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  title: string
  subtitle?: string
  href?: string
  color?: 'blue' | 'green' | 'yellow' | 'zinc'
}

interface Props {
  events: CalendarEvent[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  zinc: 'bg-zinc-400',
}

const BADGE_COLORS: Record<string, string> = {
  blue: 'text-blue-700 border-blue-200 bg-blue-50',
  green: 'text-green-700 border-green-200 bg-green-50',
  yellow: 'text-yellow-700 border-yellow-200 bg-yellow-50',
  zinc: 'text-zinc-500 border-zinc-200',
}

export function CalendarView({ events }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Build the day grid
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Pad with nulls for days before month starts
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Build event lookup by date string
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const list = eventsByDate.get(e.date) ?? []
    list.push(e)
    eventsByDate.set(e.date, list)
  }

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const selectedEvents = selectedDay ? (eventsByDate.get(selectedDay) ?? []) : []

  // Upcoming events (all months, sorted)
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
      {/* Calendar grid */}
      <div>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-zinc-900">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 border-l border-t border-zinc-200">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className="border-r border-b border-zinc-200 bg-zinc-50/50 h-[72px]"
                />
              )
            }

            const ds = dateStr(day)
            const dayEvents = eventsByDate.get(ds) ?? []
            const isToday = ds === todayStr
            const isSelected = ds === selectedDay

            return (
              <button
                key={ds}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                className={cn(
                  'border-r border-b border-zinc-200 h-[72px] p-1.5 text-left transition-colors relative',
                  isSelected ? 'bg-blue-50' : 'hover:bg-zinc-50',
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full',
                    isToday ? 'bg-zinc-900 text-white' : 'text-zinc-700',
                  )}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 2).map(e => (
                      <span
                        key={e.id}
                        className={cn(
                          'text-[10px] font-medium rounded px-1 py-0.5 truncate leading-tight',
                          e.color === 'green' ? 'bg-green-100 text-green-700' :
                          e.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                          e.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-zinc-100 text-zinc-500'
                        )}
                      >
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-zinc-400 pl-0.5">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel: selected day events or upcoming list */}
      <div className="space-y-4">
        {selectedDay && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-zinc-400">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">
            {selectedDay ? 'Upcoming' : 'Upcoming Shows'}
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-zinc-400">No upcoming shows scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const content = (
    <div
      className={cn(
        'rounded-lg border p-3 text-left w-full',
        BADGE_COLORS[event.color ?? 'blue'],
        event.href && 'hover:shadow-sm transition-shadow cursor-pointer'
      )}
    >
      <p className="text-sm font-medium leading-tight">{event.title}</p>
      {event.subtitle && (
        <p className="text-xs mt-0.5 opacity-75">{event.subtitle}</p>
      )}
      <p className="text-xs mt-1.5 opacity-60">
        {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  )

  if (event.href) {
    return <Link href={event.href}>{content}</Link>
  }
  return content
}
