// @ts-check

const { JSDOM } = require('jsdom');
const chromium = require('chrome-aws-lambda');
const fetch = require('node-fetch').default;

const getDoughnuts = async () => {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
  });

  const page = await browser.newPage();
  await page.goto(
    'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours',
  );

  const content = await page.content();
  const dom = new JSDOM(content);

  const [, ...doughnutUrls] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours'),
  ).map((node) => node.querySelector(`a[href]`).getAttribute('href'));

  const doughnuts = await Promise.all(
    doughnutUrls.map((url) =>
      fetch(`${process.env.HOST}/.netlify/functions/doughnut`, {
        method: 'post',
        body: JSON.stringify({ url }),
      }).then((res) => res.json()),
    ),
  );

  await browser.close();

  return doughnuts;
};

exports.handler = async function (event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 503,
      body: 'Unsupported Request Method',
    };
  }

  const url = `https://hooks.slack.com/services/${process.env.TESTING}`;

  const doughnuts = await getDoughnuts();

  try {
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
                    'This weeks *ARRAY* of doughnuts are: `undefined is not a function!` :sad:',
                },
              }
            : {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'This weeks *ARRAY* of doughnuts are:',
                },
              },
          { type: 'divider' },
          ...doughnuts.map((doughnut) => {
            return {
              type: 'section',
              block_id: doughnut.id,
              text: {
                type: 'mrkdwn',
                text: `*${doughnut.name}* ${doughnut.price} | <${doughnut.url}| BUY NOW!> \n ${doughnut.description}`,
              },
              accessory: {
                type: 'image',
                image_url: doughnut.imageUrl,
                alt_text: doughnut.name,
              },
            };
          }),
        ],
      }),
    });

    callback(null, {
      statusCode: 204,
      body:
        doughnuts.length === 0
          ? 'No doughnuts were posted!'
          : 'Successfully posted doughnuts!',
    });
  } catch (e) {
    callback(null, { statusCode: 500, body: 'Internal Server Error: ' + e });
  }
};
