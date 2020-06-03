const fetch = require('node-fetch').default;
const { getDoughnuts } = require('../doughnuts');

module.exports = async (req, res) => {
  const url = `https://hooks.slack.com/services/${process.env.TESTING}`;

  try {
    const doughnuts = await getDoughnuts();

    console.log(doughnuts);

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        blocks: [
          doughnuts.length === 0
            ? {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text:
                    'This weeks *ARRAY* of doughnuts are: `undefined is not a function!` :sad:'
                }
              }
            : {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'This weeks *ARRAY* of doughnuts are:'
                }
              },
          { type: 'divider' },
          ...doughnuts.map((doughnut) => {
            return {
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
            };
          })
        ]
      })
    });

    res
      .status(204)
      .send(
        doughnuts.length === 0
          ? 'No doughnuts were posted!'
          : 'Successfully posted doughnuts!'
      );
  } catch (e) {
    res.status(500).send(`Internal Server Error: ${e}!`);
  }
};
