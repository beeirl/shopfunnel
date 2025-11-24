export const isPermanentStage = ['dev', 'production'].includes($app.stage)

// export const domain = (() => {
//   if ($app.stage === 'production') return 'postfully.com'
//   if ($app.stage === 'dev') return 'dev.postfully.com'
//   return `${$app.stage}.dev.postfully.com`
// })()
