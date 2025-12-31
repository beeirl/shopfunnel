import { ImageDropzone as Dropzone } from '@/components/ui/dropzone'
import { Popover } from '@/components/ui/popover'
import { Tabs } from '@/components/ui/tabs'
import { IconLoader2 as LoaderIcon, IconMoodSmile as MoodSmileIcon, IconPhoto as PhotoIcon } from '@tabler/icons-react'
import { EmojiPicker } from 'frimousse'
import * as React from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

interface ImageDropzoneProps {
  onImageUpload?: (file: File) => Promise<void>
}

function ImageDropzone({ onImageUpload }: ImageDropzoneProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)

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

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="relative">
        <Dropzone className="h-[200px]" value={previewUrl} onValueChange={handleFile} />
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
