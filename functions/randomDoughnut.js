// @ts-check
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch').default;

const getDoughnuts = async () => {
  const content = await fetch(
    'https://boxcardonuts.ca/product-category/donuts/our-weekly-flavours?orderby=price'
  ).then((res) => res.text());

  const dom = new JSDOM(content);

  const [, ...doughnuts] = Array.from(
    dom.window.document.querySelectorAll('.product_cat-our-weekly-flavours')
  ).map((node) => {
    const name = node.querySelector('.woocommerce-loop-product__title')
      .textContent;

    return {
      url: node.querySelector(`a[href]`).getAttribute('href'),
      name,
      id: name.replace(/\s+/g, '-').toLowerCase(),
      price: `$${node.querySelector('.amount').innerHTML.split('</span>')[1]}`,
      description: '',
      imageUrl: node
        .querySelector('.woocommerce-loop-product__link img')
        .getAttribute('src')
    };
  });

  await Promise.all(
    doughnuts.map(async (doughnut) => {
      const content = await fetch(doughnut.url).then((res) => res.text());
      const dom = new JSDOM(content);
      const pageClass = '.woocommerce-product-';

      doughnut.description = dom.window.document
        .querySelector(`${pageClass}details__short-description > p`)
        .textContent.replace('  ', ' ');
    })
  );

  return randomizeDoughnuts(doughnuts);
};

const randomizeDoughnuts = (array) => array.sort(() => Math.random() - 0.5);

exports.handler = async function (event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 503,
      body: 'Unsupported Request Method'
    };
  }
  callback(null, { statusCode: 200, body: '' });

  try {
    const [firstDoughnut] = await getDoughnuts();

    const url = `https://hooks.slack.com/services/${process.env.TESTING}`;

    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: firstDoughnut
                ? 'You had me at *Hello World!* :doughnut:'
                : 'Doughnuts are `undefined is not a function!` :sad:'
            }
          },
          { type: 'divider' },
          {
            type: 'section',
            block_id: firstDoughnut.id,
            text: {
              type: 'mrkdwn',
              text: `*${firstDoughnut.name}* ${firstDoughnut.price} | <${firstDoughnut.url}| BUY NOW!> \n ${firstDoughnut.description}`
            },
            accessory: {
              type: 'image',
              image_url: firstDoughnut.imageUrl,
              alt_text: firstDoughnut.name
            }
          }
        ]
      })
    });
  } catch (e) {
    callback(null, { statusCode: 500, body: 'Internal Server Error: ' + e });
  }
};
