export const isPermanentStage = ['dev', 'production'].includes($app.stage)

export const domain = (() => {
  if ($app.stage === 'production') return 'shopfunnel.com'
  if ($app.stage === 'dev') return 'dev.shopfunnel.com'
  return `${$app.stage}.dev.shopfunnel.com`
})()
