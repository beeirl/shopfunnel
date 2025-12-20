import { Popover } from '@/components/ui/popover'
import { Tabs } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  IconLoader2 as LoaderIcon,
  IconMoodSmile as MoodSmileIcon,
  IconPhoto as PhotoIcon,
  IconUpload as UploadIcon,
} from '@tabler/icons-react'
import { EmojiPicker } from 'frimousse'
import * as React from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp'

interface ImageDropzoneProps {
  onImageUpload?: (file: File) => Promise<void>
}

function ImageDropzone({ onImageUpload }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return 'Invalid format. Use JPEG, PNG, GIF, or WebP.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Max size is 5MB.'
    }
    return null
  }

  const handleFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)

    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setIsUploading(true)

    try {
      await onImageUpload?.(file)
    } catch {
      setError('Upload failed. Please try again.')
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(url)
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
    if (file) {
      handleFile(file)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  // Show preview with spinner during upload
  if (previewUrl) {
    return (
      <div className="flex flex-col gap-2 p-2">
        <div className="relative flex h-[200px] items-center justify-center rounded-lg bg-muted">
          <img src={previewUrl} alt="Preview" className="max-h-full max-w-full rounded-lg object-contain" />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/50">
              <LoaderIcon className="size-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        )}
      >
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-full transition-colors',
            isDragging ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          <UploadIcon className="size-5" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Drop an image here or click to upload</p>
          <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP up to 5MB</p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleInputChange} className="hidden" />
    </div>
  )
}

interface MediaPickerContentProps extends React.ComponentProps<typeof Popover.Content> {
  onEmojiSelect?: (emoji: string) => void
  onImageUpload?: (file: File) => Promise<void>
  onOpenChange?: (open: boolean) => void
}

function MediaPickerContent({ onEmojiSelect, onImageUpload, onOpenChange, ...props }: MediaPickerContentProps) {
  const handleEmojiSelect = (emoji: string) => {
    onEmojiSelect?.(emoji)
    onOpenChange?.(false)
  }

  const handleImageUpload = async (file: File) => {
    await onImageUpload?.(file)
    onOpenChange?.(false)
  }

  return (
    <Popover.Content className="w-[320px] px-2 pt-2 pb-0" {...props}>
      <Tabs.Root className="gap-2" defaultValue="emoji">
        <Tabs.List className="w-full">
          <Tabs.Trigger value="emoji">
            <MoodSmileIcon />
            Emoji
          </Tabs.Trigger>
          <Tabs.Trigger value="image">
            <PhotoIcon />
            Image
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="emoji" className="outline-none">
          <EmojiPicker.Root
            className="flex h-[320px] w-full flex-col"
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
                    <div
                      className="bg-popover px-1.5 py-1 text-xs font-medium text-muted-foreground"
                      {...categoryProps}
                    >
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
        </Tabs.Content>
        <Tabs.Content value="image" className="outline-none">
          <ImageDropzone onImageUpload={handleImageUpload} />
        </Tabs.Content>
      </Tabs.Root>
    </Popover.Content>
  )
}

export const MediaPicker = {
  Root: Popover.Root,
  Trigger: Popover.Trigger,
  Content: MediaPickerContent,
}
