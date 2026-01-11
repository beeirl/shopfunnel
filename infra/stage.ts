export const isPermanentStage = ['dev', 'production'].includes($app.stage)

export const domain = (() => {
  if ($app.stage === 'production') return 'shopfunnel.app'
  if ($app.stage === 'dev') return 'dev.shopfunnel.app'
  return `${$app.stage}.dev.shopfunnel.app`
})()
