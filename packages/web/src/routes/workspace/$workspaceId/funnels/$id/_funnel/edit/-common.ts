export function getDefaultPageName(pageIndex: number): string {
  return `Page ${pageIndex + 1}`
}

export function getPageName(pageName: string | undefined, pageIndex: number): string {
  return pageName?.trim() || getDefaultPageName(pageIndex)
}

export function getBlockName(pageName: string | undefined, pageIndex: number): string {
  const name = getPageName(pageName, pageIndex)
  if (name === getDefaultPageName(pageIndex)) {
    return `Page ${pageIndex + 1}`
  }
  return name
}
