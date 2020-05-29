import { JSDOM } from 'jsdom';
import { launch } from 'puppeteer';

const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

let domain = 'https://boxcardonuts.ca';
let browser;

const runGetDoughnuts = async () => {
  const page = await getPage(
    `${domain}/product-category/donuts/our-weekly-flavours/`
  );

  const content = await page.content();
  const dom = new JSDOM(content);

  const doughnuts = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours')
  ).map((node) => {
    let doughnut = {};
    doughnut.url = node.querySelector(`a[href]`).getAttribute('href');
    return doughnut;
  });

  doughnuts.splice(0, 1);

  for (const doughnut of doughnuts) {
    await page.goto(doughnut.url);

    const content = await page.content();
    const dom = new JSDOM(content);
    const pageClass = '.woocommerce-product-';

    const title = dom.window.document.querySelector('.product_title').innerHTML;

    doughnut.id = title.replace(/\s+/g, '-').toLowerCase();
    doughnut.name = title;

    doughnut.price = `$${
      dom.window.document.querySelector('.amount').innerHTML.split('</span>')[1]
    }`;

    const description = dom.window.document.querySelector(
      `${pageClass}details__short-description > p`
    );

    doughnut.description =
      description === null
        ? 'No descrioption'
        : description.innerHTML
            .split(/\<[^>]*\>/g)
            .join('')
            .split('&nbsp;')
            .join('')
            .replace('  ', ' ');

    doughnut.imageUrl = dom.window.document
      .querySelector(`${pageClass}gallery__image`)
      .querySelector(`a[href]`)
      .getAttribute('href');
  }

  return doughnuts;
};

async function getPage(url) {
  let page = await browser.newPage();
  await page.goto(url);
  return page;
}

let doughnuts;

(async () => {
  try {
    browser = await launch();
    doughnuts = await runGetDoughnuts();
    browser.close();
  } catch (error) {
    console.log('doughnuts error: ', error);
  }
})();

exports.handler = function (event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return callback(null, {
      statusCode: 410,
      body: 'Unsupported Request Method'
    });
  }

  const url = `https://hooks.slack.com/services/${process.env.SLACK_HOOK}`;

  fetch(url, {
    method: 'POST',
    body: { mrkdwn: true, text: 'This weeks doughnuts are:' },
    json: true
  });
};

// body: {
//   mkdwn: true,
//   text: 'This weeks doughnuts are:',
//   blocks: [
//     {
//       type: 'section',
//       text: {
//         type: 'mrkdwn',
//         text: 'This weeks *ARRAY* of doughnuts are:'
//       }
//     },
//     { type: 'divider' },
//     ...doughnuts.map((doughnut) => {
//       return {
//         type: 'section',
//         block_id: doughnut.id,
//         text: {
//           type: 'mrkdwn',
//           text: `*${doughnut.name}* ${doughnut.price} | <${doughnut.url}| BUY NOW!> \n ${doughnut.description}`
//         },
//         accessory: {
//           type: 'image',
//           image_url: doughnut.imageUrl,
//           alt_text: doughnut.name
//         }
//       };
//     })
//   ]
// }
