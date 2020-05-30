<div align="center">
  <img src="./assets/logo.png">
</div>

<hr>

## What is Doughnuts Slack App? 🍩

This is a custom Slack application built to post weekly doughnuts to a slack channel of your choosing.

Using [Netlify Functions](https://docs.netlify.com/functions/overview/) it runs a serverless endpoint to grab weekly flavours from [Boxcar Donuts](https://www.boxcardonuts.ca/) and post them to Slack using webhook and their [Block Kit](https://api.slack.com/block-kit) component structure.

```ts
{
  type: 'section',
  block_id: doughnut.id,
  text: {
    type: 'mrkdwn',
    text: `*${doughnut.name}* ${doughnut.price} | <${doughnut.url}| BUY NOW!> \n ${doughnut.description}`
  },
  accessory: {
    type: 'image',
    image_url: doughnut.imageUrl,
    alt_text: doughnut.name
  }
}
```

## Preview 
<div align="center">
  <img src="./assets/preview.png">
</div>