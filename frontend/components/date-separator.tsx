interface DateSeparatorProps {
  displayDate: string
}

export default function DateSeparator({ displayDate }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <div className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-full border">
        {displayDate}
      </div>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}