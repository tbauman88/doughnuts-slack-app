// @ts-check

const { JSDOM } = require('jsdom');
const fetch = require('node-fetch').default;

const getDoughnuts = async () => {
  const content = await fetch(
    'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours',
  ).then((res) => res.text());

  const dom = new JSDOM(content);

  const [, ...doughnutUrls] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours'),
  ).map((node) => node.querySelector(`a[href]`).getAttribute('href'));

  const [, ...doughnuts] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours'),
  ).map((node) => {
    const name = node.querySelector('.woocommerce-loop-product__title')
      .textContent;
    return {
      id: name.replace(/\s+/g, '-').toLowerCase(),
      url: node.querySelector(`a[href]`).getAttribute('href'),
      name,
      description: '',
      price: `$${node.querySelector('.amount').innerHTML.split('</span>')[1]}`,
      imageUrl: node
        .querySelector('.attachment-woocommerce_thumbnail')
        .getAttribute('src'),
    };
  });

  await Promise.all(
    doughnuts.map(async (doughnut) => {
      const content = await fetch(doughnut.url).then((res) => res.text());
      const dom = new JSDOM(content);
      const pageClass = '.woocommerce-product-';

      const description = dom.window.document.querySelector(
        `${pageClass}details__short-description > p`,
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
    }),
  );

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

  console.log(doughnuts);

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
