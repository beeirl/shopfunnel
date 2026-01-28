import { Image } from '@/components/image'
import { Button } from '@/components/ui/button'
import { InputGroup } from '@/components/ui/input-group'
import { Popover } from '@/components/ui/popover'
import { Tabs } from '@/components/ui/tabs'
import { snackbar } from '@/lib/snackbar'
import { cn } from '@/lib/utils'
import {
  IconLoader2 as LoaderIcon,
  IconMoodSmile as MoodSmileIcon,
  IconPhoto as PhotoIcon,
  IconUpload as UploadIcon,
  IconX as XIcon,
} from '@tabler/icons-react'
import { EmojiPicker } from 'frimousse'
import * as React from 'react'

type MediaValue = { type: 'emoji'; value: string } | { type: 'image'; value: string }

interface MediaPickerContextValue {
  value?: MediaValue
  onValueChange?: (type: 'emoji' | 'image' | undefined, value?: string | File) => void
}

const MediaPickerContext = React.createContext<MediaPickerContextValue | null>(null)

function useMediaPicker() {
  const context = React.use(MediaPickerContext)
  if (!context) throw new Error('useMediaPicker must be used within MediaPicker.Root')
  return context
}

interface MediaPickerRootProps {
  children: React.ReactNode
  value?: MediaValue
  onValueChange?: (type: 'emoji' | 'image' | undefined, value?: string | File) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}

function MediaPickerRoot({ children, value, onValueChange, ...popoverProps }: MediaPickerRootProps) {
  const contextValue = React.useMemo<MediaPickerContextValue>(() => ({ value, onValueChange }), [value, onValueChange])

  return (
    <MediaPickerContext.Provider value={contextValue}>
      <Popover.Root {...popoverProps}>{children}</Popover.Root>
    </MediaPickerContext.Provider>
  )
}

interface MediaPickerTriggerProps extends React.ComponentProps<typeof Popover.Trigger> {}

function MediaPickerTrigger(props: MediaPickerTriggerProps) {
  return <Popover.Trigger {...props} />
}

interface MediaPickerInputProps extends React.ComponentProps<typeof InputGroup.Root> {}

function MediaPickerInput(props: MediaPickerInputProps) {
  const { value, onValueChange } = useMediaPicker()

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.(undefined)
  }

  return (
    <InputGroup.Root {...props}>
      <InputGroup.Addon>
        <InputGroup.Button size="icon-xs">
          {!value && <PhotoIcon className="size-4" />}
          {value?.type === 'emoji' && <span className="text-base">{value.value}</span>}
          {value?.type === 'image' && (
            <Image src={value.value} alt="" layout="fixed" width={24} height={24} className="rounded object-cover" />
          )}
        </InputGroup.Button>
      </InputGroup.Addon>
      <InputGroup.Input
        readOnly
        className="cursor-pointer"
        placeholder="Media"
        value={value ? (value.type === 'emoji' ? 'Emoji' : 'Image') : ''}
      />
      {value && (
        <InputGroup.Addon align="inline-end">
          <InputGroup.Button size="icon-xs" variant="ghost" onClick={handleClear}>
            <XIcon />
          </InputGroup.Button>
        </InputGroup.Addon>
      )}
    </InputGroup.Root>
  )
}

interface MediaPickerContentProps extends React.ComponentProps<typeof Popover.Content> {}

function MediaPickerContent({ className, ...props }: MediaPickerContentProps) {
  return <Popover.Content className={cn('w-[320px] px-2 pt-2 pb-0', className)} {...props} />
}

interface MediaPickerTabsProps {
  children: React.ReactNode
  className?: string
}

function MediaPickerTabs({ children, className }: MediaPickerTabsProps) {
  const { value } = useMediaPicker()

  return (
    <Tabs.Root className={cn('gap-2', className)} defaultValue={value?.type ?? 'emoji'}>
      {children}
    </Tabs.Root>
  )
}

interface MediaPickerTabListProps {
  children: React.ReactNode
  className?: string
}

function MediaPickerTabList({ children, className }: MediaPickerTabListProps) {
  return <Tabs.List className={cn('w-full', className)}>{children}</Tabs.List>
}

function MediaPickerEmojiTab() {
  return (
    <Tabs.Trigger value="emoji">
      <MoodSmileIcon />
      Emoji
    </Tabs.Trigger>
  )
}

function MediaPickerImageTab() {
  return (
    <Tabs.Trigger value="image">
      <PhotoIcon />
      Image
    </Tabs.Trigger>
  )
}

interface MediaPickerEmojiTabContentProps {
  children: React.ReactNode
  className?: string
}

function MediaPickerEmojiTabContent({ children, className }: MediaPickerEmojiTabContentProps) {
  return (
    <Tabs.Content value="emoji" className={cn('outline-none', className)}>
      {children}
    </Tabs.Content>
  )
}

interface MediaPickerImageTabContentProps {
  children: React.ReactNode
  className?: string
}

function MediaPickerImageTabContent({ children, className }: MediaPickerImageTabContentProps) {
  return (
    <Tabs.Content value="image" className={cn('outline-none', className)}>
      {children}
    </Tabs.Content>
  )
}

interface MediaPickerEmojiPickerProps {
  className?: string
}

function MediaPickerEmojiPicker({ className }: MediaPickerEmojiPickerProps) {
  const { onValueChange } = useMediaPicker()

  const handleEmojiSelect = (emoji: string) => {
    onValueChange?.('emoji', emoji)
  }

  return (
    <EmojiPicker.Root
      className={cn('flex h-[320px] w-full flex-col', className)}
      onEmojiSelect={(emoji) => handleEmojiSelect(emoji.emoji)}
    >
      <EmojiPicker.Search
        className="mb-1 h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
        placeholder="Search emoji..."
      />
      <EmojiPicker.Viewport className="relative flex-1 outline-none">
        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </EmojiPicker.Loading>
        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No emoji found.
        </EmojiPicker.Empty>
        <EmojiPicker.List
          className="pb-1.5 select-none"
          components={{
            CategoryHeader: ({ category, ...categoryProps }) => (
              <div className="bg-popover px-1.5 py-1 text-xs font-medium text-muted-foreground" {...categoryProps}>
                {category.label}
              </div>
            ),
            Row: ({ children, ...rowProps }) => (
              <div className="scroll-my-1.5 justify-between" {...rowProps}>
                {children}
              </div>
            ),
            Emoji: ({ emoji, ...emojiProps }) => (
              <button
                className="flex size-8 items-center justify-center rounded-md text-lg data-active:bg-muted"
                {...emojiProps}
              >
                {emoji.emoji}
              </button>
            ),
          }}
        />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  )
}

interface MediaPickerImagePickerProps {
  accept?: string[]
  maxSize?: number
  maxDimensions?: { width: number; height: number }
  className?: string
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function MediaPickerImagePicker({
  accept = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize = 10 * 1024 * 1024, // 10MB
  maxDimensions,
  className,
}: MediaPickerImagePickerProps) {
  const { value, onValueChange } = useMediaPicker()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  // Clean up object URL when previewUrl changes or component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // Clear preview when value is updated (upload completed)
  React.useEffect(() => {
    if (value?.type === 'image' && value.value && previewUrl) {
      setPreviewUrl(null)
    }
  }, [value, previewUrl])

  const acceptString = accept.join(',')

  const validateFile = async (file: File): Promise<string | null> => {
    // Check MIME type
    if (!accept.includes(file.type)) {
      return 'File type not supported'
    }

    // Check file size
    if (file.size > maxSize) {
      return 'File is too big'
    }

    // Check dimensions (skip for SVG and ICO)
    if (maxDimensions && !['image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(file.type)) {
      try {
        const dimensions = await getImageDimensions(file)
        if (dimensions.width > maxDimensions.width || dimensions.height > maxDimensions.height) {
          return 'Image resolution too high'
        }
      } catch {
        return "Couldn't load image"
      }
    }

    return null
  }

  const handleFile = async (file: File) => {
    const validationError = await validateFile(file)
    if (validationError) {
      snackbar.add({ type: 'error', title: validationError })
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setIsUploading(true)

    try {
      await onValueChange?.('image', file)
    } catch {
      snackbar.add({ type: 'error', title: 'Upload failed' })
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = previewUrl ?? (value?.type === 'image' ? value.value : null)

  return (
    <div className={cn('flex flex-col gap-2 pb-2', className)}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex h-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted transition-colors ${
          isDragging ? 'border-ring' : 'border-border hover:border-ring/50'
        }`}
      >
        {displayUrl ? (
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <PhotoIcon className="size-10 opacity-30 group-hover:hidden" />
        )}

        {/* Hover overlay */}
        {!isUploading && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100',
              displayUrl && 'bg-white/80 backdrop-blur-sm',
            )}
          >
            <Button className="cursor-pointer">
              <UploadIcon />
              Upload
            </Button>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50">
            <LoaderIcon className="size-8 animate-spin text-primary" />
          </div>
        )}

        <input ref={inputRef} type="file" accept={acceptString} onChange={handleInputChange} className="hidden" />
      </div>
    </div>
  )
}

export const MediaPicker = {
  Root: MediaPickerRoot,
  Trigger: MediaPickerTrigger,
  Input: MediaPickerInput,
  Content: MediaPickerContent,
  Tabs: MediaPickerTabs,
  TabList: MediaPickerTabList,
  EmojiTab: MediaPickerEmojiTab,
  ImageTab: MediaPickerImageTab,
  EmojiTabContent: MediaPickerEmojiTabContent,
  ImageTabContent: MediaPickerImageTabContent,
  EmojiPicker: MediaPickerEmojiPicker,
  ImagePicker: MediaPickerImagePicker,
}
